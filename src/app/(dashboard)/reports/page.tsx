import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { ReportsHubClient } from "./reports-hub-client";

export const dynamic = "force-dynamic";

export default async function ReportsHubPage() {
  const session = await requireTenantAuth();
  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const activeSession = await tx.examSession.findFirst({
      where: { instituteId: session.instituteId },
      orderBy: { createdAt: "desc" },
    });

    if (!activeSession) {
      return { sessionName: "No Active Session", daySlots: [], staff: [] };
    }

    const [timetable, staff] = await Promise.all([
      tx.timetableEntry.findMany({
        where: { sessionId: activeSession.id },
        select: { examDay: true, examDate: true, slot: true },
        distinct: ["examDay", "slot"],
        orderBy: [{ examDay: "asc" }, { slot: "asc" }],
      }),
      tx.staff.findMany({
        where: { instituteId: activeSession.instituteId },
        select: { id: true, name: true, department: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      sessionName: activeSession.name,
      daySlots: timetable.map((t) => ({
        examDay: t.examDay,
        examDate: t.examDate.toISOString().slice(0, 10),
        slot: t.slot,
      })),
      staff,
    };
  });

  return <ReportsHubClient initialData={data} />;
}
