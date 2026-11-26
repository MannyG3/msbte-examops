import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { AllocateClient } from "./allocate-client";

export default async function SupervisionAllocatePage() {
  const session = await requireAuth();

  const activeSession = await prisma.examSession.findFirst({
    where: { instituteId: session.instituteId, isCurrent: true },
    include: {
      supervisionDuties: {
        include: {
          staff: true,
          room: true,
        },
      },
      _count: {
        select: { theoryPapers: true },
      },
    },
  });

  const staff = await prisma.staff.findMany({
    where: { instituteId: session.instituteId, isActive: true },
    include: {
      department: true,
      _count: {
        select: {
          supervisionDuties: {
            where: { sessionId: activeSession?.id },
          },
        },
      },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <AllocateClient
        activeSession={activeSession ? JSON.parse(JSON.stringify(activeSession)) : null}
        staffList={JSON.parse(JSON.stringify(staff))}
      />
    </div>
  );
}
