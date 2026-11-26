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

    const { slotId, sessionId, entries, lockSlot = false } = await req.json();
    // entries: [{ studentId, assessmentHeadId, headType, marksObtained, minMarks, status, courseCode }]

    if (!slotId || !sessionId || !Array.isArray(entries)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    let detainedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const e of entries) {
        const marks = parseFloat(e.marksObtained) || 0;
        const existing = await tx.mark.findFirst({
          where: {
            sessionId,
            studentId: e.studentId,
            assessmentHeadId: e.assessmentHeadId,
            classTestId: null,
          },
        });

        if (existing) {
          await tx.mark.update({
            where: { id: existing.id },
            data: {
              marksObtained: marks,
              status: e.status || "PRESENT",
              isLocked: Boolean(lockSlot),
              enteredBy: session.name,
            },
          });
        } else {
          await tx.mark.create({
            data: {
              sessionId,
              studentId: e.studentId,
              assessmentHeadId: e.assessmentHeadId,
              classTestId: null,
              marksObtained: marks,
              status: e.status || "PRESENT",
              isLocked: Boolean(lockSlot),
              enteredBy: session.name,
            },
          });
        }

        // Enforce MSBTE Rule: FA-PR failure => Detained in semester
        if (e.headType === "FA_PR" && (marks < e.minMarks || e.status === "ABSENT")) {
          detainedCount++;
          await tx.student.update({
            where: { id: e.studentId },
            data: {
              status: "DETAINED",
              detentionReason: `FA-PR below minimum (${marks}/${e.minMarks}) in ${e.courseCode}`,
            },
          });
        }
      }

      if (lockSlot) {
        await tx.practicalSlot.update({
          where: { id: slotId },
          data: { isLocked: true },
        });
      }
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: lockSlot ? "PRACTICAL_MARKS_LOCKED" : "PRACTICAL_MARKS_SAVED",
      entity: "PracticalSlot",
      entityId: slotId,
      afterData: { entriesSaved: entries.length, detainedCount, lockSlot },
    });

    return NextResponse.json({ success: true, detainedCount });
  } catch (error: any) {
    console.error("Practical marks error:", error);
    return NextResponse.json({ error: error.message || "Failed to save practical marks" }, { status: 500 });
  }
}
