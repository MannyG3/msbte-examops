import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { StaffClient } from "./staff-client";

export default async function StaffPage() {
  const session = await requireTenantAuth();

  const staff = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    return tx.staff.findMany({
      where: { instituteId: session.instituteId },
      orderBy: [{ type: "asc" }, { department: "asc" }, { name: "asc" }],
    });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <StaffClient staff={JSON.parse(JSON.stringify(staff))} />
    </div>
  );
}
