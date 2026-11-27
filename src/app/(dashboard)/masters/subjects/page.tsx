import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { SubjectsClient } from "./subjects-client";

export default async function SubjectsPage() {
  const session = await requireTenantAuth();

  const subjects = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    return tx.subject.findMany({
      where: { instituteId: session.instituteId },
      include: { scheme: true },
      orderBy: [{ scheme: { name: "desc" } }, { code: "asc" }],
    });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SubjectsClient subjects={JSON.parse(JSON.stringify(subjects))} />
    </div>
  );
}
