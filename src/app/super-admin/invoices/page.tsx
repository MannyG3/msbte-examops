import { requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { InvoicesClient } from "./invoices-client";

export const dynamic = "force-dynamic";

export default async function SuperAdminInvoicesPage() {
  await requireSuperAdmin();

  const [invoices, institutes] = await Promise.all([
    prisma.invoice.findMany({
      include: { institute: true },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.institute.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <InvoicesClient
      invoices={JSON.parse(JSON.stringify(invoices))}
      institutes={institutes}
    />
  );
}
