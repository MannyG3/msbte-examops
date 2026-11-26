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

    const { sessionId, paperId, studentId, examDate, slot, isAbsent, isUfm, ufmDetails, answerBookNo } =
      await req.json();

    if (!sessionId || !paperId || !studentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isAbsent && !isUfm) {
      // Student is marked Present with no UFM -> remove absentee record if exists
      await prisma.absenteeRecord.deleteMany({
        where: { sessionId, paperId, studentId },
      });
    } else {
      await prisma.absenteeRecord.upsert({
        where: {
          sessionId_paperId_studentId: {
            sessionId,
            paperId,
            studentId,
          },
        },
        update: {
          isAbsent: Boolean(isAbsent),
          isUfm: Boolean(isUfm),
          ufmDetails: ufmDetails || null,
          answerBookNo: answerBookNo || null,
          recordedBy: session.name,
        },
        create: {
          sessionId,
          paperId,
          studentId,
          examDate: new Date(examDate),
          slot,
          isAbsent: Boolean(isAbsent),
          isUfm: Boolean(isUfm),
          ufmDetails: ufmDetails || null,
          answerBookNo: answerBookNo || null,
          recordedBy: session.name,
        },
      });
    }

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: isUfm ? "RECORD_UFM_CASE" : isAbsent ? "MARK_STUDENT_ABSENT" : "MARK_STUDENT_PRESENT",
      entity: "AbsenteeRecord",
      afterData: { paperId, studentId, isAbsent, isUfm, ufmDetails },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save exam day record" }, { status: 500 });
  }
}
