import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";

export async function getPreExamSlotData(day: number, slot: "MORNING" | "AFTERNOON") {
  const session = await requireTenantAuth();
  return withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const [institute, activeSession, blocks] = await Promise.all([
      tx.institute.findUnique({ where: { id: session.instituteId } }),
      tx.examSession.findFirst({
        where: { instituteId: session.instituteId },
        orderBy: { createdAt: "desc" },
      }),
      tx.block.findMany({
        where: { instituteId: session.instituteId },
        include: { room: true },
        orderBy: { blockNo: "asc" },
      }),
    ]);

    if (!activeSession) {
      return { institute, activeSession: null, blocks, allocations: [], duties: [], entries: [] };
    }

    const [allocations, duties, entries] = await Promise.all([
      tx.blockAllocation.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
        include: {
          candidatePaper: {
            include: {
              candidate: true,
              timetableEntry: { include: { subject: true } },
            },
          },
        },
        orderBy: [{ blockId: "asc" }, { benchNo: "asc" }],
      }),
      tx.supervisionDuty.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
        include: { staff: true, block: { include: { room: true } } },
        orderBy: [{ role: "asc" }, { blockId: "asc" }],
      }),
      tx.timetableEntry.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
        include: {
          subject: true,
          _count: { select: { papers: true } },
        },
        orderBy: [{ csm: "asc" }, { subject: { code: "asc" } }],
      }),
    ]);

    return { institute, activeSession, blocks, allocations, duties, entries };
  });
}

export function formatMsbteDate(d?: Date | string | null): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-GB").replace(/\//g, "-");
}
