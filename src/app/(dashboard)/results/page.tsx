import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { ResultsClient } from "./results-client";

export const dynamic = "force-dynamic";

export default async function ResultsAnalysisPage() {
  const session = await requireTenantAuth();

  const records = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const active = await tx.examSession.findFirst({
      where: { instituteId: session.instituteId },
      orderBy: { createdAt: "desc" },
    });
    if (!active) return [];
    return tx.resultRecord.findMany({
      where: { sessionId: active.id },
      orderBy: [{ marks: "desc" }],
    });
  });

  return <ResultsClient initialRecords={JSON.parse(JSON.stringify(records))} />;
}
