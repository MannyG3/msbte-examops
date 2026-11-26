import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { SwapsClient } from "./swaps-client";

export default async function SwapRequestsPage() {
  const session = await requireAuth();

  const swapRequests = await prisma.dutySwapRequest.findMany({
    where: {
      duty: {
        session: {
          instituteId: session.instituteId,
        },
      },
    },
    include: {
      duty: {
        include: { room: true },
      },
      requester: true,
      target: true,
    },
    orderBy: { id: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SwapsClient swapRequests={JSON.parse(JSON.stringify(swapRequests))} />
    </div>
  );
}
