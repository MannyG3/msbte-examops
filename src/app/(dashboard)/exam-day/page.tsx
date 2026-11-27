import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { ExamDayClient } from "./exam-day-client";

export const dynamic = "force-dynamic";

export default async function ExamDayPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; slot?: string }>;
}) {
  const sp = await searchParams;
  const day = Number(sp.day || "1");
  const slot = (sp.slot || "MORNING") as "MORNING" | "AFTERNOON";

  const session = await requireTenantAuth();

  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const activeSession = await tx.examSession.findFirst({
      where: { instituteId: session.instituteId },
      orderBy: { createdAt: "desc" },
    });

    if (!activeSession) {
      return {
        sessionName: "No Active Session",
        sessionStatus: "DRAFT",
        daySlots: [],
        blocks: [],
        allocations: [],
        submissions: [],
        copyCases: [],
        earlyLeavings: [],
        answerBookRecords: [],
        entries: [],
      };
    }

    const [
      daySlots,
      blocks,
      allocations,
      submissions,
      copyCases,
      earlyLeavings,
      answerBookRecords,
      entries,
    ] = await Promise.all([
      tx.timetableEntry.findMany({
        where: { sessionId: activeSession.id },
        select: { examDay: true, examDate: true, slot: true },
        distinct: ["examDay", "slot"],
        orderBy: [{ examDay: "asc" }, { slot: "asc" }],
      }),
      tx.block.findMany({
        where: { instituteId: session.instituteId },
        include: { room: true },
        orderBy: { blockNo: "asc" },
      }),
      tx.blockAllocation.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
        include: {
          candidatePaper: {
            include: {
              candidate: true,
              timetableEntry: { include: { subject: true } },
              statuses: { include: { specialCode: true } },
            },
          },
        },
        orderBy: [{ blockId: "asc" }, { benchNo: "asc" }],
      }),
      tx.blockSubmission.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
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
        orderBy: { createdAt: "desc" },
      }),
      tx.earlyLeaving.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
        orderBy: { id: "desc" },
      }),
      tx.answerBookRecord.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
      }),
      tx.timetableEntry.findMany({
        where: { sessionId: activeSession.id, examDay: day, slot },
        include: { subject: true, qpInventory: true, _count: { select: { papers: true } } },
        orderBy: { csm: "asc" },
      }),
    ]);

    return {
      sessionName: activeSession.name,
      sessionStatus: activeSession.status,
      daySlots: daySlots.map((d) => ({
        examDay: d.examDay,
        examDate: d.examDate.toISOString().slice(0, 10),
        slot: d.slot,
      })),
      blocks: blocks.map((b) => ({
        id: b.id,
        blockNo: b.blockNo,
        roomNo: b.room.roomNo,
      })),
      allocations: allocations.map((a) => {
        const st = a.candidatePaper.statuses.find((s) => s.section === 1) ?? a.candidatePaper.statuses[0];
        const isDet = a.candidatePaper.isDetained || a.candidatePaper.candidate.isDetained;
        return {
          id: a.id,
          blockId: a.blockId,
          benchNo: a.benchNo,
          candidatePaperId: a.candidatePaperId,
          seatNo: a.candidatePaper.candidate.seatNo,
          csm: a.candidatePaper.timetableEntry.csm,
          subjectCode: a.candidatePaper.timetableEntry.subject.code,
          isDetained: isDet,
          statusCode: isDet ? "DET" : st?.specialCode.code ?? "PR",
          mainBookSerial: st?.mainBookSerial ?? "",
          supplementSerials: st?.supplementSerials ?? "",
        };
      }),
      submissions: submissions.map((s) => ({
        blockId: s.blockId,
        isSubmitted: s.isSubmitted,
      })),
      copyCases: copyCases.map((c) => ({
        id: c.id,
        seatNo: c.candidatePaper.candidate.seatNo,
        csm: c.candidatePaper.timetableEntry.csm,
        subjectCode: c.candidatePaper.timetableEntry.subject.code,
        reportedTime: c.reportedTime,
        materialSeized: c.materialSeized,
        supervisorStatement: c.supervisorStatement,
      })),
      earlyLeavings: earlyLeavings.map((e) => ({
        id: e.id,
        seatNo: e.seatNo,
        csm: e.csm,
        timeOut: e.timeOut,
      })),
      answerBookRecords: answerBookRecords.map((r) => ({
        blockId: r.blockId,
        mainProvided: r.mainProvided,
        mainUsed: r.mainUsed,
        suppProvided: r.suppProvided,
        suppUsed: r.suppUsed,
        drawingProvided: r.drawingProvided,
        drawingUsed: r.drawingUsed,
        graphProvided: r.graphProvided,
        graphUsed: r.graphUsed,
      })),
      entries: entries.map((e) => ({
        id: e.id,
        csm: e.csm,
        subjectCode: e.subject.code,
        subjectName: e.subject.name,
        candidateCount: e._count.papers,
        receivedCount: e.qpInventory?.receivedCount ?? e._count.papers,
        usedCount: e.qpInventory?.usedCount ?? 0,
        returnedCount: e.qpInventory?.returnedCount ?? 0,
        extraCount: e.qpInventory?.extraCount ?? 0,
        lessCount: e.qpInventory?.lessCount ?? 0,
      })),
    };
  });

  return <ExamDayClient day={day} slot={slot} initialData={data} />;
}
