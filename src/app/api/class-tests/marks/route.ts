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

    const { sessionId, courseId, divisionId, assessmentHeadId, maxMarks = 30, rows } =
      await req.json();
    // rows: [{ studentId, ct1, ct2, ct1Absent, ct2Absent, faAvg }]

    if (!sessionId || !courseId || !divisionId || !assessmentHeadId || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Invalid marks payload" }, { status: 400 });
    }

    // Ensure CT1 and CT2 ClassTest records exist
    const [ct1Obj, ct2Obj] = await Promise.all([
      prisma.classTest.upsert({
        where: {
          sessionId_courseId_divisionId_testNumber: {
            sessionId,
            courseId,
            divisionId,
            testNumber: 1,
          },
        },
        update: {},
        create: {
          sessionId,
          courseId,
          divisionId,
          testNumber: 1,
          testDate: new Date("2026-09-21"),
          startTime: "10:30 AM",
          endTime: "11:30 AM",
          maxMarks,
        },
      }),
      prisma.classTest.upsert({
        where: {
          sessionId_courseId_divisionId_testNumber: {
            sessionId,
            courseId,
            divisionId,
            testNumber: 2,
          },
        },
        update: {},
        create: {
          sessionId,
          courseId,
          divisionId,
          testNumber: 2,
          testDate: new Date("2026-10-12"),
          startTime: "10:30 AM",
          endTime: "11:30 AM",
          maxMarks,
        },
      }),
    ]);

    await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        // Save CT1
        if (r.ct1 !== "" || r.ct1Absent) {
          const val = r.ct1Absent ? 0 : Math.min(maxMarks, Math.max(0, parseFloat(r.ct1) || 0));
          await tx.mark.upsert({
            where: {
              sessionId_studentId_assessmentHeadId_classTestId: {
                sessionId,
                studentId: r.studentId,
                assessmentHeadId,
                classTestId: ct1Obj.id,
              },
            },
            update: {
              marksObtained: val,
              status: r.ct1Absent ? "ABSENT" : "PRESENT",
              enteredBy: session.name,
            },
            create: {
              sessionId,
              studentId: r.studentId,
              assessmentHeadId,
              classTestId: ct1Obj.id,
              marksObtained: val,
              status: r.ct1Absent ? "ABSENT" : "PRESENT",
              enteredBy: session.name,
            },
          });
        }

        // Save CT2
        if (r.ct2 !== "" || r.ct2Absent) {
          const val = r.ct2Absent ? 0 : Math.min(maxMarks, Math.max(0, parseFloat(r.ct2) || 0));
          await tx.mark.upsert({
            where: {
              sessionId_studentId_assessmentHeadId_classTestId: {
                sessionId,
                studentId: r.studentId,
                assessmentHeadId,
                classTestId: ct2Obj.id,
              },
            },
            update: {
              marksObtained: val,
              status: r.ct2Absent ? "ABSENT" : "PRESENT",
              enteredBy: session.name,
            },
            create: {
              sessionId,
              studentId: r.studentId,
              assessmentHeadId,
              classTestId: ct2Obj.id,
              marksObtained: val,
              status: r.ct2Absent ? "ABSENT" : "PRESENT",
              enteredBy: session.name,
            },
          });
        }

        // Save Final FA-TH Average (classTestId = null)
        if (r.faAvg !== null && r.faAvg !== undefined) {
          const existingAvg = await tx.mark.findFirst({
            where: {
              sessionId,
              studentId: r.studentId,
              assessmentHeadId,
              classTestId: null,
            },
          });

          if (existingAvg) {
            await tx.mark.update({
              where: { id: existingAvg.id },
              data: {
                marksObtained: r.faAvg,
                status: r.ct1Absent && r.ct2Absent ? "ABSENT" : "PRESENT",
                enteredBy: session.name,
              },
            });
          } else {
            await tx.mark.create({
              data: {
                sessionId,
                studentId: r.studentId,
                assessmentHeadId,
                classTestId: null,
                marksObtained: r.faAvg,
                status: r.ct1Absent && r.ct2Absent ? "ABSENT" : "PRESENT",
                enteredBy: session.name,
              },
            });
          }
        }
      }
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "CLASS_TEST_MARKS_SAVED",
      entity: "Mark",
      afterData: { courseId, divisionId, studentCount: rows.length },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("CT marks save error:", error);
    return NextResponse.json({ error: error.message || "Failed to save marks" }, { status: 500 });
  }
}
