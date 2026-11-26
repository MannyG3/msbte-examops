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

    const { courseId, divisionId, testNumber, testDate, startTime, endTime, maxMarks = 30 } =
      await req.json();

    if (!courseId || !divisionId || !testNumber || !testDate || !startTime || !endTime) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const activeSession = await prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
    });

    if (!activeSession) {
      return NextResponse.json({ error: "No active session found" }, { status: 404 });
    }

    const parsedDate = new Date(testDate);

    // Clash check: does this division already have a class test at this date & startTime?
    const clash = await prisma.classTest.findFirst({
      where: {
        sessionId: activeSession.id,
        divisionId,
        startTime,
        testDate: {
          gte: new Date(new Date(parsedDate).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(parsedDate).setHours(23, 59, 59, 999)),
        },
        NOT: {
          AND: [{ courseId }, { testNumber: Number(testNumber) }],
        },
      },
      include: { course: true },
    });

    if (clash) {
      return NextResponse.json(
        {
          error: `Division Clash: ${clash.course.code} (${clash.course.title}) is already scheduled on ${testDate} at ${startTime}`,
        },
        { status: 409 }
      );
    }

    const ct = await prisma.classTest.upsert({
      where: {
        sessionId_courseId_divisionId_testNumber: {
          sessionId: activeSession.id,
          courseId,
          divisionId,
          testNumber: Number(testNumber),
        },
      },
      update: {
        testDate: parsedDate,
        startTime,
        endTime,
        maxMarks: Number(maxMarks),
      },
      create: {
        sessionId: activeSession.id,
        courseId,
        divisionId,
        testNumber: Number(testNumber),
        testDate: parsedDate,
        startTime,
        endTime,
        maxMarks: Number(maxMarks),
      },
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "SCHEDULE_CLASS_TEST",
      entity: "ClassTest",
      entityId: ct.id,
      afterData: { courseId, divisionId, testNumber, testDate, startTime },
    });

    return NextResponse.json({ success: true, classTest: ct });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to schedule class test" }, { status: 500 });
  }
}
