import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { SeatingClient } from "./seating-client";

export default async function SeatingGeneratorPage(props: {
  searchParams?: Promise<{ date?: string; slot?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireAuth();

  const activeSession = await prisma.examSession.findFirst({
    where: { instituteId: session.instituteId, isCurrent: true },
    include: {
      theoryPapers: {
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
          seatingAllocations: {
            include: {
              room: true,
              student: true,
            },
          },
        },
        orderBy: [{ examDate: "asc" }, { slot: "asc" }],
      },
    },
  });

  const rooms = await prisma.room.findMany({
    where: { instituteId: session.instituteId },
    orderBy: [{ building: "asc" }, { floor: "asc" }, { name: "asc" }],
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SeatingClient
        activeSession={activeSession ? JSON.parse(JSON.stringify(activeSession)) : null}
        rooms={JSON.parse(JSON.stringify(rooms))}
        initialDate={searchParams?.date}
        initialSlot={searchParams?.slot}
      />
    </div>
  );
}
