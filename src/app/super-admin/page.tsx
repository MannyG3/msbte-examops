import { requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { SuperAdminClient } from "./super-admin-client";

export default async function SuperAdminPage() {
  await requireSuperAdmin();

  const [institutes, plans, impersonations] = await Promise.all([
    prisma.institute.findMany({
      include: {
        plan: true,
        _count: {
          select: {
            memberships: true,
            blocks: true,
            staff: true,
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({ orderBy: { priceInr: "asc" } }),
    prisma.impersonationLog.findMany({
      include: { institute: true, superAdmin: true },
      orderBy: { startedAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <SuperAdminClient
      institutes={JSON.parse(JSON.stringify(institutes))}
      plans={JSON.parse(JSON.stringify(plans))}
      impersonations={JSON.parse(JSON.stringify(impersonations))}
    />
  );
}
