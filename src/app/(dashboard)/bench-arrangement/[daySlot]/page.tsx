import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { DaySlotClient } from "./day-slot-client";

export default async function DaySlotGridPage(props: {
  params: Promise<{ daySlot: string }>;
}) {
  const { daySlot } = await props.params;
  const [dayStr, slotRaw] = daySlot.split("-");
  const examDay = parseInt(dayStr, 10) || 1;
  const slot = (slotRaw || "MORNING").toUpperCase() as "MORNING" | "AFTERNOON";

  const session = await requireTenantAuth();

  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const activeSession = await tx.examSession.findFirst({
      where: { instituteId: session.instituteId },
      orderBy: { createdAt: "desc" },
    });
    if (!activeSession) return { activeSession: null, blocks: [], allocations: [] };

    const [blocks, allocations] = await Promise.all([
      tx.block.findMany({
        where: { instituteId: session.instituteId },
        include: { room: true },
        orderBy: { blockNo: "asc" },
      }),
      tx.blockAllocation.findMany({
        where: { sessionId: activeSession.id, examDay, slot },
        include: {
          block: { include: { room: true } },
          candidatePaper: {
            include: {
              candidate: true,
              timetableEntry: { include: { subject: true } },
            },
          },
        },
        orderBy: [{ block: { blockNo: "asc" } }, { benchNo: "asc" }],
      }),
    ]);

    return { activeSession, blocks, allocations };
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <DaySlotClient
        sessionId={data.activeSession?.id || ""}
        examDay={examDay}
        slot={slot}
        blocks={JSON.parse(JSON.stringify(data.blocks))}
        allocations={JSON.parse(JSON.stringify(data.allocations))}
      />
    </div>
  );
}
