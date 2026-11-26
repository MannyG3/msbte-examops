import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ExamDayClient } from "./exam-day-client";

export default async function ExamDayConsolePage(props: {
  searchParams?: Promise<{ date?: string; slot?: string; room?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireAuth();

  const activeSession = await prisma.examSession.findFirst({
    where: { instituteId: session.instituteId, isCurrent: true },
    include: {
      theoryPapers: {
        orderBy: [{ examDate: "asc" }, { slot: "asc" }],
      },
    },
  });

  const rooms = await prisma.room.findMany({
    where: { instituteId: session.instituteId, type: "CLASSROOM" },
    orderBy: { name: "asc" },
  });

  const examDate = searchParams?.date || "2026-11-21";
  const slot = (searchParams?.slot || "MORNING").toUpperCase();
  const parsedDate = new Date(examDate);

  const allocations = activeSession
    ? await prisma.seatingAllocation.findMany({
        where: {
          paper: {
            sessionId: activeSession.id,
            slot,
            examDate: {
              gte: new Date(new Date(parsedDate).setHours(0, 0, 0, 0)),
              lte: new Date(new Date(parsedDate).setHours(23, 59, 59, 999)),
            },
          },
        },
        include: {
          student: true,
          paper: true,
          room: true,
        },
        orderBy: [{ roomId: "asc" }, { benchNo: "asc" }, { seatPosition: "asc" }],
      })
    : [];

  const absentees = activeSession
    ? await prisma.absenteeRecord.findMany({
        where: {
          sessionId: activeSession.id,
          slot,
          examDate: {
            gte: new Date(new Date(parsedDate).setHours(0, 0, 0, 0)),
            lte: new Date(new Date(parsedDate).setHours(23, 59, 59, 999)),
          },
        },
        include: {
          student: true,
          paper: true,
        },
      })
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ExamDayClient
        activeSession={activeSession ? JSON.parse(JSON.stringify(activeSession)) : null}
        rooms={JSON.parse(JSON.stringify(rooms))}
        allocations={JSON.parse(JSON.stringify(allocations))}
        absentees={JSON.parse(JSON.stringify(absentees))}
        initialDate={examDate}
        initialSlot={slot}
        initialRoom={searchParams?.room}
      />
    </div>
  );
}
