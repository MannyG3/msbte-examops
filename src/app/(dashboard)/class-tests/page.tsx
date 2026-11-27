import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { ClassTestsClient } from "./class-tests-client";

export const dynamic = "force-dynamic";

export default async function ClassTestsPage() {
  const session = await requireTenantAuth();

  const marks = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const active = await tx.examSession.findFirst({
      where: { instituteId: session.instituteId },
      orderBy: { createdAt: "desc" },
    });
    if (!active) return [];
    return tx.classTestMark.findMany({
      where: { sessionId: active.id },
      orderBy: [{ csm: "asc" }, { subjectCode: "asc" }, { seatNo: "asc" }],
    });
  });

  return <ClassTestsClient initialMarks={JSON.parse(JSON.stringify(marks))} />;
}
