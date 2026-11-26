import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { TimetableClient } from "./timetable-client";

export default async function TheoryTimetablePage() {
  const session = await requireAuth();

  const activeSession = await prisma.examSession.findFirst({
    where: { instituteId: session.instituteId, isCurrent: true },
    include: {
      theoryPapers: {
        include: {
          course: {
            include: {
              programme: true,
              scheme: true,
              _count: {
                select: { studentCourses: true },
              },
            },
          },
          seatingAllocations: {
            select: { id: true },
          },
        },
        orderBy: [{ examDate: "asc" }, { slot: "asc" }, { paperCode: "asc" }],
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <TimetableClient
        activeSession={activeSession ? JSON.parse(JSON.stringify(activeSession)) : null}
      />
    </div>
  );
}
