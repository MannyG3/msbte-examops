import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateSeatingPlan, SeatingPaperInput, SeatingRoomInput } from "@/lib/schedulers/seating-generator";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examDate, slot, alternateOnBench = true } = await req.json();

    if (!examDate || !slot) {
      return NextResponse.json({ error: "Exam date and slot are required" }, { status: 400 });
    }

    const activeSession = await prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
    });

    if (!activeSession) {
      return NextResponse.json({ error: "No active session found" }, { status: 404 });
    }

    const parsedDate = new Date(examDate);

    // Find all papers running on this date and slot
    const papers = await prisma.theoryPaper.findMany({
      where: {
        sessionId: activeSession.id,
        slot: slot.toUpperCase(),
        examDate: {
          gte: new Date(new Date(parsedDate).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(parsedDate).setHours(23, 59, 59, 999)),
        },
      },
      include: {
        course: {
          include: {
            programme: true,
            studentCourses: {
              include: {
                student: true,
              },
            },
          },
        },
      },
    });

    if (papers.length === 0) {
      return NextResponse.json({ error: "No papers scheduled for this date and slot" }, { status: 400 });
    }

    // Find available rooms
    const rooms = await prisma.room.findMany({
      where: { instituteId: session.instituteId },
      orderBy: [{ building: "asc" }, { floor: "asc" }, { name: "asc" }],
    });

    // Format for pure scheduler
    const schedulerPapers: SeatingPaperInput[] = papers.map((p) => ({
      paperId: p.id,
      paperCode: p.paperCode,
      paperName: p.paperName,
      schemeString: p.schemeString,
      students: p.course.studentCourses.map((sc) => ({
        studentId: sc.student.id,
        name: sc.student.name,
        enrollmentNo: sc.student.enrollmentNo,
        seatNo: sc.student.seatNo || sc.student.rollNo,
        rollNo: sc.student.rollNo,
        programmeCode: p.course.programme.code,
      })),
    }));

    const schedulerRooms: SeatingRoomInput[] = rooms.map((r) => ({
      roomId: r.id,
      roomName: r.name,
      benchCount: r.benchCount,
      seatsPerBench: r.seatsPerBench,
      isLocked: r.isLocked,
    }));

    // Run pure TS scheduler
    const result = generateSeatingPlan(schedulerPapers, schedulerRooms, {
      alternateOnBench,
      sortBy: "seatNo",
    });

    // Save allocations in database transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing allocations for these papers
      const paperIds = papers.map((p) => p.id);
      await tx.seatingAllocation.deleteMany({
        where: {
          paperId: { in: paperIds },
        },
      });

      // Insert new allocations
      for (const alloc of result.allocations) {
        await tx.seatingAllocation.create({
          data: {
            paperId: alloc.paperId,
            studentId: alloc.studentId,
            roomId: alloc.roomId,
            benchNo: alloc.benchNo,
            seatPosition: alloc.seatPosition,
            version: 1,
            isLocked: false,
          },
        });
      }
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "SEATING_GENERATE",
      entity: "SeatingAllocation",
      afterData: {
        examDate,
        slot,
        totalAllocated: result.stats.totalAllocated,
        roomsUsed: result.stats.totalRoomsUsed,
        clashes: result.stats.adjacentPaperClashes,
      },
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Seating generate API error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate seating" }, { status: 500 });
  }
}
