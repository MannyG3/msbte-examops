import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BenchGridClient } from "./bench-grid-client";

export default async function RoomBenchGridPage(props: {
  params: Promise<{ slotId: string }>;
  searchParams: Promise<{ date?: string; slot?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const session = await requireAuth();

  const roomId = params.slotId;
  const examDate = searchParams.date || "2026-11-17";
  const slot = searchParams.slot || "MORNING";

  const room = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!room || room.instituteId !== session.instituteId) {
    notFound();
  }

  const parsedDate = new Date(examDate);

  const allocations = await prisma.seatingAllocation.findMany({
    where: {
      roomId,
      paper: {
        slot: slot.toUpperCase(),
        examDate: {
          gte: new Date(new Date(parsedDate).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(parsedDate).setHours(23, 59, 59, 999)),
        },
      },
    },
    include: {
      student: {
        include: {
          division: true,
        },
      },
      paper: true,
    },
    orderBy: [{ benchNo: "asc" }, { seatPosition: "asc" }],
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <BenchGridClient
        room={JSON.parse(JSON.stringify(room))}
        allocations={JSON.parse(JSON.stringify(allocations))}
        examDate={examDate}
        slot={slot}
      />
    </div>
  );
}
