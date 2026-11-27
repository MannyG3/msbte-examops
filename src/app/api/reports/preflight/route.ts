import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const day = Number(searchParams.get("day") || "1");
    const slot = (searchParams.get("slot") || "MORNING") as "MORNING" | "AFTERNOON";
    const instId = session.instituteId;

    const checks = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const activeSession = await tx.examSession.findFirst({
        where: { instituteId: instId },
        orderBy: { createdAt: "desc" },
      });
      if (!activeSession) {
        return {
          errors: ["No active exam session found."],
          warnings: [],
        };
      }

      const [entries, allocations, duties, dayReceipt] = await Promise.all([
        tx.timetableEntry.findMany({
          where: { sessionId: activeSession.id, examDay: day, slot },
          include: { subject: true, qpInventory: true, _count: { select: { papers: true } } },
        }),
        tx.blockAllocation.findMany({
          where: { sessionId: activeSession.id, examDay: day, slot },
          select: { blockId: true, candidatePaperId: true },
        }),
        tx.supervisionDuty.findMany({
          where: { sessionId: activeSession.id, examDay: day, slot, role: "JUNIOR" },
          select: { blockId: true },
        }),
        tx.dayReceipt.findFirst({
          where: { sessionId: activeSession.id, examDay: day },
        }),
      ]);

      const errors: string[] = [];
      const warnings: string[] = [];

      const totalPapers = entries.reduce((acc, e) => acc + e._count.papers, 0);
      if (totalPapers > 0 && allocations.length < totalPapers) {
        errors.push(
          `Unallocated candidates: ${totalPapers - allocations.length} of ${totalPapers} candidates have no bench assigned.`
        );
      }

      const missingAbbr = entries.filter((e) => !e.subject.abbreviation || e.subject.abbreviation.trim() === "");
      if (missingAbbr.length > 0) {
        errors.push(
          `Missing subject abbreviations for: ${missingAbbr.map((m) => m.subject.code).join(", ")}`
        );
      }

      const qpShortfalls = entries.filter(
        (e) => e.qpInventory && e.qpInventory.qpCount < e._count.papers
      );
      if (qpShortfalls.length > 0) {
        warnings.push(
          `QP Inventory lower than seating count for: ${qpShortfalls.map((q) => q.subject.code).join(", ")}`
        );
      }

      const activeBlockIds = new Set(allocations.map((a) => a.blockId));
      const supervisedBlockIds = new Set(duties.map((d) => d.blockId).filter(Boolean));
      const unsupervised = Array.from(activeBlockIds).filter((id) => !supervisedBlockIds.has(id));
      if (unsupervised.length > 0) {
        warnings.push(`${unsupervised.length} active block(s) do not have a Junior Supervisor assigned yet.`);
      }

      if (!dayReceipt?.controllerName) {
        warnings.push(`Controller of Examination name not entered yet for Day ${day} receipts.`);
      }

      return { errors, warnings, totalCandidates: totalPapers, allocatedCandidates: allocations.length };
    });

    return NextResponse.json(checks);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
