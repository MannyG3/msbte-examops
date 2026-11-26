import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { MyDutiesClient } from "./my-duties-client";

export default async function MyDutiesPage() {
  const session = await requireAuth();

  const activeSession = await prisma.examSession.findFirst({
    where: { instituteId: session.instituteId, isCurrent: true },
  });

  // Find staff record linked to user, or fallback to first teaching staff for coordinator preview
  let staff = await prisma.staff.findFirst({
    where: { userId: session.userId, instituteId: session.instituteId },
  });

  if (!staff) {
    staff = await prisma.staff.findFirst({
      where: { instituteId: session.instituteId, type: "TEACHING" },
    });
  }

  const [duties, otherStaff, mySwaps] = await Promise.all([
    staff && activeSession
      ? prisma.supervisionDuty.findMany({
          where: { sessionId: activeSession.id, staffId: staff.id },
          include: { room: true },
          orderBy: [{ examDate: "asc" }, { slot: "asc" }],
        })
      : [],
    prisma.staff.findMany({
      where: {
        instituteId: session.instituteId,
        isActive: true,
        type: "TEACHING",
        id: { not: staff?.id || "" },
      },
      orderBy: { name: "asc" },
    }),
    staff
      ? prisma.dutySwapRequest.findMany({
          where: { requesterStaffId: staff.id },
          include: {
            duty: { include: { room: true } },
            target: true,
          },
          orderBy: { id: "desc" },
        })
      : [],
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <MyDutiesClient
        staff={staff ? JSON.parse(JSON.stringify(staff)) : null}
        duties={JSON.parse(JSON.stringify(duties))}
        otherStaff={JSON.parse(JSON.stringify(otherStaff))}
        mySwaps={JSON.parse(JSON.stringify(mySwaps))}
      />
    </div>
  );
}
