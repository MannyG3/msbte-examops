import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { BenchArrangementClient } from "./bench-arrangement-client";

export default async function BenchArrangementPage() {
  const session = await requireTenantAuth();

  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const activeSession = await tx.examSession.findFirst({
      where: { instituteId: session.instituteId },
      orderBy: { createdAt: "desc" },
    });
    if (!activeSession) return { activeSession: null, entries: [], allocCounts: [] };

    const [entries, allocs] = await Promise.all([
      tx.timetableEntry.findMany({
        where: { sessionId: activeSession.id },
        include: {
          subject: true,
          _count: { select: { papers: true } },
        },
        orderBy: [{ examDay: "asc" }, { slot: "asc" }, { csm: "asc" }],
      }),
      tx.blockAllocation.groupBy({
        by: ["examDay", "slot"],
        where: { sessionId: activeSession.id },
        _count: { id: true },
        _max: { version: true },
      }),
    ]);

    return { activeSession, entries, allocCounts: allocs };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <BenchArrangementClient
        activeSession={data.activeSession ? JSON.parse(JSON.stringify(data.activeSession)) : null}
        entries={JSON.parse(JSON.stringify(data.entries))}
        allocCounts={JSON.parse(JSON.stringify(data.allocCounts))}
      />
    </div>
  );
}
