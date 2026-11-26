import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, attendanceRows, minAttendancePct, enforceFaPrPass } = body;

    if (action === "IMPORT_ATTENDANCE" && Array.isArray(attendanceRows)) {
      let imported = 0;
      const students = await prisma.student.findMany({
        where: { instituteId: session.instituteId },
      });
      const courses = await prisma.course.findMany({
        where: { programme: { instituteId: session.instituteId } },
      });

      for (const r of attendanceRows) {
        const student = students.find((s) => s.enrollmentNo === String(r.enrollmentNo).trim());
        const course = courses.find((c) => c.code === String(r.courseCode).trim());
        if (!student || !course) continue;

        const pct = parseFloat(r.percentage);
        if (isNaN(pct)) continue;

        await prisma.attendanceRecord.upsert({
          where: {
            studentId_courseId: { studentId: student.id, courseId: course.id },
          },
          update: {
            percentage: pct,
            totalConducted: 40,
            totalAttended: Math.round((pct / 100) * 40),
          },
          create: {
            studentId: student.id,
            courseId: course.id,
            percentage: pct,
            totalConducted: 40,
            totalAttended: Math.round((pct / 100) * 40),
          },
        });
        imported++;
      }

      await logAuditAction({
        instituteId: session.instituteId,
        userId: session.userId,
        action: "IMPORT_ATTENDANCE",
        entity: "AttendanceRecord",
        afterData: { imported },
      });

      return NextResponse.json({ success: true, imported });
    }

    if (action === "RUN_RULES") {
      // Update rule config
      let rule = await prisma.eligibilityRule.findFirst({
        where: { instituteId: session.instituteId },
      });
      if (rule) {
        rule = await prisma.eligibilityRule.update({
          where: { id: rule.id },
          data: {
            minAttendancePct: minAttendancePct ?? rule.minAttendancePct,
            enforceFaPrPass: enforceFaPrPass ?? rule.enforceFaPrPass,
          },
        });
      } else {
        rule = await prisma.eligibilityRule.create({
          data: {
            instituteId: session.instituteId,
            minAttendancePct: minAttendancePct ?? 75.0,
            enforceFaPrPass: enforceFaPrPass ?? true,
          },
        });
      }

      const activeSession = await prisma.examSession.findFirst({
        where: { instituteId: session.instituteId, isCurrent: true },
      });

      const students = await prisma.student.findMany({
        where: { instituteId: session.instituteId },
        include: {
          attendanceRecords: { include: { course: true } },
          marks: {
            where: activeSession ? { sessionId: activeSession.id } : undefined,
            include: { assessmentHead: { include: { course: true } } },
          },
        },
      });

      let detainedCount = 0;

      await prisma.$transaction(async (tx) => {
        for (const st of students) {
          const reasons: string[] = [];

          // Rule 1: Attendance below threshold
          for (const att of st.attendanceRecords) {
            if (att.percentage < rule!.minAttendancePct) {
              reasons.push(
                `Attendance ${att.percentage}% < ${rule!.minAttendancePct}% in ${att.course.code}`
              );
            }
          }

          // Rule 2: FA-PR below minimum passing marks
          if (rule!.enforceFaPrPass) {
            for (const m of st.marks) {
              if (
                m.assessmentHead.headType === "FA_PR" &&
                (m.marksObtained < m.assessmentHead.minMarks || m.status === "ABSENT")
              ) {
                reasons.push(
                  `FA-PR failed (${m.marksObtained}/${m.assessmentHead.minMarks}) in ${m.assessmentHead.course.code}`
                );
              }
            }
          }

          if (reasons.length > 0) {
            detainedCount++;
            await tx.student.update({
              where: { id: st.id },
              data: {
                status: "DETAINED",
                detentionReason: reasons.join("; "),
              },
            });
          } else if (st.status === "DETAINED") {
            await tx.student.update({
              where: { id: st.id },
              data: {
                status: "REGULAR",
                detentionReason: null,
              },
            });
          }
        }
      });

      await logAuditAction({
        instituteId: session.instituteId,
        userId: session.userId,
        action: "RUN_ELIGIBILITY_ENGINE",
        entity: "EligibilityRule",
        afterData: {
          minAttendancePct: rule.minAttendancePct,
          enforceFaPrPass: rule.enforceFaPrPass,
          detainedCount,
        },
      });

      return NextResponse.json({ success: true, detainedCount });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Eligibility API error:", error);
    return NextResponse.json({ error: error.message || "Failed to process eligibility" }, { status: 500 });
  }
}
