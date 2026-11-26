import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ScheduleClient } from "./schedule-client";

export default async function ClassTestSchedulePage() {
  const session = await requireAuth();

  const programmes = await prisma.programme.findMany({
    where: { instituteId: session.instituteId },
    select: { id: true },
  });
  const programmeIds = programmes.map((p) => p.id);

  const [activeSession, courses, divisions] = await Promise.all([
    prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
      include: {
        classTests: {
          include: {
            course: true,
            division: true,
          },
          orderBy: [{ testDate: "asc" }, { startTime: "asc" }],
        },
      },
    }),
    prisma.course.findMany({
      where: { programmeId: { in: programmeIds }, hasTheory: true },
      orderBy: [{ semester: "asc" }, { code: "asc" }],
    }),
    prisma.division.findMany({
      where: { programmeId: { in: programmeIds } },
      orderBy: [{ semester: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ScheduleClient
        classTests={JSON.parse(JSON.stringify(activeSession?.classTests || []))}
        courses={JSON.parse(JSON.stringify(courses))}
        divisions={JSON.parse(JSON.stringify(divisions))}
      />
    </div>
  );
}
