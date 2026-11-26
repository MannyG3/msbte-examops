import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  allocateSupervisionDuties,
  DutySessionSlotInput,
  DutyStaffInput,
} from "@/lib/schedulers/duty-allocator";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      studentsPerSupervisor = 30,
      assignRelievers = true,
      assignSeniorSupervisor = true,
      assignPeons = true,
    } = await req.json();

    const activeSession = await prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
    });

    if (!activeSession) {
      return NextResponse.json({ error: "No active exam session found" }, { status: 404 });
    }

    const [papers, rooms, staffMembers] = await Promise.all([
      prisma.theoryPaper.findMany({
        where: { sessionId: activeSession.id },
        include: {
          course: {
            include: {
              _count: { select: { studentCourses: true } },
            },
          },
          seatingAllocations: {
            select: { roomId: true, studentId: true },
          },
        },
        orderBy: [{ examDate: "asc" }, { slot: "asc" }],
      }),
      prisma.room.findMany({
        where: { instituteId: session.instituteId, type: "CLASSROOM" },
        orderBy: { name: "asc" },
      }),
      prisma.staff.findMany({
        where: { instituteId: session.instituteId, isActive: true },
        include: { teachingCourses: true },
      }),
    ]);

    // Group papers by date + slot
    const slotMap = new Map<string, DutySessionSlotInput>();

    papers.forEach((p) => {
      const dateStr = new Date(p.examDate).toISOString().split("T")[0];
      const key = `${dateStr}_${p.slot}`;

      if (!slotMap.has(key)) {
        slotMap.set(key, {
          date: dateStr,
          slot: p.slot as "MORNING" | "AFTERNOON",
          rooms: [],
          courseIds: [],
        });
      }

      const entry = slotMap.get(key)!;
      if (!entry.courseIds.includes(p.courseId)) {
        entry.courseIds.push(p.courseId);
      }

      // If seating allocations exist, use exact rooms
      if (p.seatingAllocations.length > 0) {
        const roomCountMap = new Map<string, number>();
        p.seatingAllocations.forEach((a) => {
          roomCountMap.set(a.roomId, (roomCountMap.get(a.roomId) || 0) + 1);
        });
        roomCountMap.forEach((count, rId) => {
          const existingRoom = entry.rooms.find((r) => r.roomId === rId);
          if (existingRoom) {
            existingRoom.studentCount += count;
          } else {
            const roomObj = rooms.find((r) => r.id === rId);
            entry.rooms.push({
              roomId: rId,
              roomName: roomObj?.name || "Room",
              studentCount: count,
            });
          }
        });
      }
    });

    // For slots without seating allocations yet, estimate rooms from headcounts
    slotMap.forEach((entry, key) => {
      if (entry.rooms.length === 0) {
        const slotPapers = papers.filter((p) => {
          const dateStr = new Date(p.examDate).toISOString().split("T")[0];
          return `${dateStr}_${p.slot}` === key;
        });
        const totalStudents = slotPapers.reduce(
          (sum, p) => sum + (p.course._count.studentCourses || 0),
          0
        );
        const roomsNeeded = Math.max(1, Math.ceil(totalStudents / 30));
        for (let i = 0; i < Math.min(roomsNeeded, rooms.length); i++) {
          entry.rooms.push({
            roomId: rooms[i].id,
            roomName: rooms[i].name,
            studentCount: Math.min(30, totalStudents),
          });
        }
      }
    });

    const schedulerStaff: DutyStaffInput[] = staffMembers.map((s) => ({
      staffId: s.id,
      name: s.name,
      designation: s.designation,
      type: s.type as "TEACHING" | "LAB_ASSISTANT" | "PEON",
      maxDuties: s.maxDutiesPerSession,
      teachingCourseIds: s.teachingCourses.map((tc) => tc.courseId),
    }));

    const result = allocateSupervisionDuties(Array.from(slotMap.values()), schedulerStaff, {
      studentsPerSupervisor,
      assignRelievers,
      assignSeniorSupervisor,
      assignPeons,
    });

    // Persist in database
    await prisma.$transaction(async (tx) => {
      await tx.supervisionDuty.deleteMany({
        where: { sessionId: activeSession.id },
      });

      for (const d of result.duties) {
        await tx.supervisionDuty.create({
          data: {
            sessionId: activeSession.id,
            examDate: new Date(d.date),
            slot: d.slot,
            roomId: d.roomId,
            staffId: d.staffId,
            role: d.role,
            version: 1,
            isConfirmed: true,
          },
        });
      }
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "SUPERVISION_DUTY_ALLOCATE",
      entity: "SupervisionDuty",
      afterData: {
        totalDuties: result.stats.totalDutiesAssigned,
        backToBack: result.stats.backToBackCount,
        conflictsAvoided: result.stats.subjectConflictsAvoided,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Supervision allocate error:", error);
    return NextResponse.json({ error: error.message || "Failed to allocate duties" }, { status: 500 });
  }
}
