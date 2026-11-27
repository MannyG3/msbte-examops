import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  allocateBenches,
  getBenchCoordinates,
  BenchBlockInput,
  BenchCandidateInput,
  BenchAllocationResult,
} from "@/lib/allocators/bench-allocator";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      examDay,
      slot,
      keepPaperInSingleBlock = false,
      leaveEmptyBenches = 0,
      interleavePapers = false,
    } = await req.json();

    if (!examDay || !slot) {
      return NextResponse.json({ error: "examDay and slot are required" }, { status: 400 });
    }

    const instId = session.instituteId;

    const outcome = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const activeSession = await tx.examSession.findFirst({
        where: { instituteId: instId },
        orderBy: { createdAt: "desc" },
      });
      if (!activeSession) throw new Error("No active session found");

      const [entries, blocks, existingAllocs] = await Promise.all([
        tx.timetableEntry.findMany({
          where: { sessionId: activeSession.id, examDay: Number(examDay), slot },
          include: {
            subject: true,
            papers: { include: { candidate: true } },
          },
          orderBy: { csm: "asc" },
        }),
        tx.block.findMany({
          where: { instituteId: instId },
          include: { room: true },
          orderBy: { blockNo: "asc" },
        }),
        tx.blockAllocation.findMany({
          where: { sessionId: activeSession.id, examDay: Number(examDay), slot },
          include: {
            block: true,
            candidatePaper: { include: { candidate: true, timetableEntry: true } },
          },
        }),
      ]);

      if (entries.length === 0) throw new Error("No papers scheduled for this Day & Slot");
      if (blocks.length === 0) throw new Error("No blocks configured in Masters");

      const maxPrevVersion = existingAllocs.reduce((m, a) => Math.max(m, a.version), 0);
      const nextVersion = maxPrevVersion + 1;

      const lockedBlockIds = new Set(existingAllocs.filter((a) => a.isLocked).map((a) => a.blockId));

      const lockedAllocations: BenchAllocationResult[] = existingAllocs
        .filter((a) => a.isLocked)
        .map((a) => ({
          blockId: a.blockId,
          blockNo: a.block.blockNo,
          candidatePaperId: a.candidatePaperId,
          benchNo: a.benchNo,
          columnNo: a.columnNo,
          rowNo: a.rowNo,
          seatNo: a.candidatePaper.candidate.seatNo,
          csm: a.candidatePaper.timetableEntry.csm,
          instCode: a.candidatePaper.candidate.instCode,
          isDetained: a.candidatePaper.isDetained || a.candidatePaper.candidate.isDetained,
          isLocked: true,
        }));

      const blockInputs: BenchBlockInput[] = blocks.map((b) => ({
        blockId: b.id,
        blockNo: b.blockNo,
        roomNo: b.room.roomNo,
        columns: b.columns,
        columnBreak: b.columnBreak,
        strength: b.strength,
        numberingStyle: b.numberingStyle,
        isLocked: lockedBlockIds.has(b.id),
      }));

      const candidateInputs: BenchCandidateInput[] = [];
      entries.forEach((e, idx) => {
        e.papers.forEach((cp) => {
          candidateInputs.push({
            candidatePaperId: cp.id,
            seatNo: cp.candidate.seatNo,
            instCode: cp.candidate.instCode,
            csm: e.csm,
            subjectCode: e.subject.code,
            subjectName: e.subject.name,
            abbreviation: e.subject.abbreviation,
            timeRange: e.timeRange,
            timetableOrder: idx + 1,
            isDetained: cp.isDetained || cp.candidate.isDetained,
          });
        });
      });

      const result = allocateBenches(candidateInputs, blockInputs, {
        keepPaperInSingleBlock,
        leaveEmptyBenches: Number(leaveEmptyBenches) || 0,
        interleavePapers,
        lockedAllocations,
      });

      // Compute diff vs previous version
      const prevMap = new Map(existingAllocs.map((a) => [a.candidatePaperId, `${a.blockId}:${a.benchNo}`]));
      let changedCount = 0;
      result.allocations.forEach((a) => {
        if (!a.isLocked && prevMap.get(a.candidatePaperId) !== `${a.blockId}:${a.benchNo}`) {
          changedCount++;
        }
      });

      // Replace unlocked allocations
      await tx.blockAllocation.deleteMany({
        where: {
          sessionId: activeSession.id,
          examDay: Number(examDay),
          slot,
          isLocked: false,
        },
      });

      const toInsert = result.allocations
        .filter((a) => !a.isLocked)
        .map((a) => ({
          instituteId: instId,
          sessionId: activeSession.id,
          examDay: Number(examDay),
          slot,
          blockId: a.blockId,
          candidatePaperId: a.candidatePaperId,
          benchNo: a.benchNo,
          columnNo: a.columnNo,
          rowNo: a.rowNo,
          version: nextVersion,
          isLocked: false,
        }));

      if (toInsert.length > 0) {
        await tx.blockAllocation.createMany({ data: toInsert });
      }

      return {
        stats: result.stats,
        unallocatedCount: result.unallocated.length,
        version: nextVersion,
        changedCount,
      };
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: "BENCH_ARRANGEMENT_GENERATE",
      entity: "BlockAllocation",
      afterData: { examDay, slot, ...outcome },
    });

    return NextResponse.json({ success: true, ...outcome });
  } catch (error: any) {
    console.error("Bench allocator API error:", error);
    return NextResponse.json({ error: error.message || "Allocation failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const instId = session.instituteId;

    if (body.action === "TOGGLE_LOCK") {
      const { sessionId, examDay, slot, blockId, isLocked } = body;
      await withTenant(instId, session.isSuperAdmin, async (tx) => {
        await tx.blockAllocation.updateMany({
          where: { sessionId, examDay: Number(examDay), slot, blockId },
          data: { isLocked: Boolean(isLocked) },
        });
      });
      await logAuditAction({
        instituteId: instId,
        userId: session.userId,
        action: isLocked ? "LOCK_BLOCK" : "UNLOCK_BLOCK",
        entity: "BlockAllocation",
        entityId: blockId,
        afterData: { examDay, slot, isLocked },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "MOVE_CANDIDATE") {
      const { allocationId, targetBlockId } = body;
      await withTenant(instId, session.isSuperAdmin, async (tx) => {
        const alloc = await tx.blockAllocation.findUnique({ where: { id: allocationId } });
        if (!alloc) throw new Error("Allocation not found");
        if (alloc.isLocked) throw new Error("Source block is locked");

        const targetBlock = await tx.block.findUnique({ where: { id: targetBlockId } });
        if (!targetBlock) throw new Error("Target block not found");

        const existingTarget = await tx.blockAllocation.findMany({
          where: {
            sessionId: alloc.sessionId,
            examDay: alloc.examDay,
            slot: alloc.slot,
            blockId: targetBlockId,
          },
          orderBy: { benchNo: "asc" },
        });

        if (existingTarget.some((a) => a.isLocked)) {
          throw new Error("Target block is locked");
        }

        const usedBenches = new Set(existingTarget.map((a) => a.benchNo));
        let freeBench = 1;
        while (usedBenches.has(freeBench) && freeBench <= targetBlock.strength) {
          freeBench++;
        }
        if (freeBench > targetBlock.strength) {
          throw new Error(`Block ${targetBlock.blockNo} is full (${targetBlock.strength} benches)`);
        }

        const coords = getBenchCoordinates(
          freeBench,
          targetBlock.columns,
          targetBlock.columnBreak,
          targetBlock.numberingStyle
        );

        await tx.blockAllocation.update({
          where: { id: allocationId },
          data: {
            blockId: targetBlockId,
            benchNo: freeBench,
            columnNo: coords.columnNo,
            rowNo: coords.rowNo,
            version: { increment: 1 },
          },
        });
      });

      await logAuditAction({
        instituteId: instId,
        userId: session.userId,
        action: "MOVE_CANDIDATE_BLOCK",
        entity: "BlockAllocation",
        entityId: allocationId,
        afterData: { targetBlockId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 });
  }
}
