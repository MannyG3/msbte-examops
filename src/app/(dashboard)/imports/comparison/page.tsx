import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { ComparisonClient } from "./comparison-client";

export default async function StudentCountComparisonPage() {
  const session = await requireTenantAuth();

  const entries = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const activeSession = await tx.examSession.findFirst({
      where: { instituteId: session.instituteId },
      orderBy: { createdAt: "desc" },
    });
    if (!activeSession) return [];

    return tx.timetableEntry.findMany({
      where: { sessionId: activeSession.id },
      include: {
        subject: { include: { scheme: true } },
        qpInventory: true,
        _count: { select: { papers: true } },
      },
      orderBy: [{ examDay: "asc" }, { slot: "asc" }, { csm: "asc" }],
    });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ComparisonClient entries={JSON.parse(JSON.stringify(entries))} />
    </div>
  );
}
