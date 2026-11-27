import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";

export async function getPostExamSlotData(day: number, slot: "MORNING" | "AFTERNOON") {
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
      return {
        institute,
        activeSession: null,
        blocks,
        entries: [],
        earlyLeavings: [],
        answerBookRecords: [],
        copyCases: [],
        marksheets: [],
      };
    }

    const [entries, earlyLeavings, answerBookRecords, copyCases, marksheets] = await Promise.all([
      tx.timetableEntry.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
        include: {
          subject: true,
          qpInventory: true,
          papers: {
            include: {
              candidate: true,
              statuses: { include: { specialCode: true } },
            },
            orderBy: { candidate: { seatNo: "asc" } },
          },
        },
        orderBy: [{ csm: "asc" }, { subject: { code: "asc" } }],
      }),
      tx.earlyLeaving.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
        orderBy: { seatNo: "asc" },
      }),
      tx.answerBookRecord.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
        include: { block: { include: { room: true } } },
        orderBy: { block: { blockNo: "asc" } },
      }),
      tx.copyCase.findMany({
        where: {
          instituteId: session.instituteId,
          candidatePaper: { timetableEntry: { sessionId: activeSession.id, examDay: day, slot } },
        },
        include: {
          candidatePaper: {
            include: { candidate: true, timetableEntry: { include: { subject: true } } },
          },
        },
      }),
      tx.marksheetRecord.findMany({
        where: { sessionId: activeSession.id },
        orderBy: { seatNo: "asc" },
        take: 500,
      }),
    ]);

    return {
      institute,
      activeSession,
      blocks,
      entries,
      earlyLeavings,
      answerBookRecords,
      copyCases,
      marksheets,
    };
  });
}
