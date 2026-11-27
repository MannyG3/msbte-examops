import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { RoomsBlocksClient } from "./rooms-blocks-client";

export default async function RoomsBlocksPage() {
  const session = await requireTenantAuth();

  const blocks = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    return tx.block.findMany({
      where: { instituteId: session.instituteId },
      include: { room: true },
      orderBy: { blockNo: "asc" },
    });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <RoomsBlocksClient blocks={JSON.parse(JSON.stringify(blocks))} />
    </div>
  );
}
