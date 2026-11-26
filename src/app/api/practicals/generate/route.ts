import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  generatePracticalSchedule,
  PracticalTaskInput,
  PracticalLabInput,
  PracticalStaffInput,
} from "@/lib/schedulers/practical-scheduler";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const holidays: string[] = body.holidays || [];

    const activeSession = await prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
    });

    if (!activeSession) {
      return NextResponse.json({ error: "No active session found" }, { status: 404 });
    }

    const programmes = await prisma.programme.findMany({
      where: { instituteId: session.instituteId },
      select: { id: true },
    });
    const programmeIds = programmes.map((p) => p.id);

    const [courses, divisions, labs, staffMembers] = await Promise.all([
      prisma.course.findMany({
        where: { programmeId: { in: programmeIds }, hasPractical: true },
        include: { assessmentHeads: true },
      }),
      prisma.division.findMany({
        where: { programmeId: { in: programmeIds } },
        include: {
          batches: {
            include: {
              _count: { select: { students: true } },
            },
          },
        },
      }),
      prisma.room.findMany({
        where: { instituteId: session.instituteId, type: "LAB" },
        orderBy: { name: "asc" },
      }),
      prisma.staff.findMany({
        where: { instituteId: session.instituteId, isActive: true, type: "TEACHING" },
        include: { teachingCourses: true },
      }),
    ]);

    if (labs.length === 0) {
      return NextResponse.json({ error: "No LAB rooms configured in Masters" }, { status: 400 });
    }

    const tasks: PracticalTaskInput[] = [];
    for (const div of divisions) {
      const divCourses = courses.filter((c) => c.semester === div.semester);
      for (const course of divCourses) {
        const isExternal = course.assessmentHeads.some(
          (h) => h.headType === "SA_PR" && h.tag === "EXTERNAL"
        );
        for (const batch of div.batches) {
          tasks.push({
            courseId: course.id,
            courseCode: course.code,
            courseTitle: course.title,
            semester: course.semester,
            divisionId: div.id,
            divisionName: div.name,
            batchId: batch.id,
            batchName: batch.name,
            studentCount: batch._count.students || 20,
            isExternal,
          });
        }
      }
    }

    const labInputs: PracticalLabInput[] = labs.map((l) => ({
      roomId: l.id,
      roomName: l.name,
      capacity: l.totalCapacity,
      equipmentCount: l.labEquipmentCount,
    }));

    const staffInputs: PracticalStaffInput[] = staffMembers.map((s) => ({
      staffId: s.id,
      name: s.name,
      teachingCourseIds: s.teachingCourses.map((tc) => tc.courseId),
    }));

    const mainWindow = {
      startDate: activeSession.practicalStartDate.toISOString().split("T")[0],
      endDate: activeSession.practicalEndDate.toISOString().split("T")[0],
    };

    const sem1Window = activeSession.sem1PracticalStartDate && activeSession.sem1PracticalEndDate
      ? {
          startDate: activeSession.sem1PracticalStartDate.toISOString().split("T")[0],
          endDate: activeSession.sem1PracticalEndDate.toISOString().split("T")[0],
        }
      : mainWindow;

    const result = generatePracticalSchedule(
      tasks,
      labInputs,
      staffInputs,
      { mainWindow, sem1Window },
      holidays
    );

    await prisma.$transaction(async (tx) => {
      await tx.practicalSlot.deleteMany({
        where: { sessionId: activeSession.id },
      });

      for (const s of result.slots) {
        await tx.practicalSlot.create({
          data: {
            sessionId: activeSession.id,
            courseId: s.courseId,
            divisionId: s.divisionId,
            batchId: s.batchId,
            roomId: s.roomId,
            examDate: new Date(s.examDate),
            startTime: s.startTime,
            endTime: s.endTime,
            internalExaminerId: s.internalExaminerId,
            isLocked: false,
          },
        });
      }
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "PRACTICAL_TIMETABLE_GENERATE",
      entity: "PracticalSlot",
      afterData: result.stats,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Practical generate error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate practical timetable" }, { status: 500 });
  }
}
