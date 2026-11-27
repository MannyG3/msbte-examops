export interface BenchBlockInput {
  blockId: string;
  blockNo: number;
  roomNo: string;
  columns: number;
  columnBreak: number;
  strength: number;
  numberingStyle: "SERPENTINE" | "STRAIGHT";
  isLocked?: boolean;
}

export interface BenchCandidateInput {
  candidatePaperId: string;
  seatNo: string;
  instCode: string;
  csm: string;
  subjectCode: string;
  subjectName: string;
  abbreviation: string;
  timeRange: string;
  timetableOrder: number;
  isDetained: boolean;
}

export interface BenchAllocationResult {
  blockId: string;
  blockNo: number;
  candidatePaperId: string;
  benchNo: number;
  columnNo: number;
  rowNo: number;
  seatNo: string;
  csm: string;
  instCode: string;
  isDetained: boolean;
  isLocked: boolean;
}

export interface BenchAllocatorOptions {
  keepPaperInSingleBlock?: boolean;
  leaveEmptyBenches?: number;
  interleavePapers?: boolean;
  lockedAllocations?: BenchAllocationResult[];
}

export interface BenchAllocatorOutput {
  allocations: BenchAllocationResult[];
  unallocated: BenchCandidateInput[];
  stats: {
    totalCandidates: number;
    allocatedCount: number;
    blocksUsed: number;
    detainedCount: number;
  };
}

/**
 * Computes (columnNo, rowNo) for a 1-indexed benchNo in a block.
 * Serpentine: Col 1 top-down (1..9), Col 2 bottom-up (18..10), Col 3 top-down (19..27), etc.
 */
export function getBenchCoordinates(
  benchNo: number,
  columns: number,
  columnBreak: number,
  numberingStyle: "SERPENTINE" | "STRAIGHT" = "SERPENTINE"
): { columnNo: number; rowNo: number } {
  const colIdx = Math.floor((benchNo - 1) / columnBreak);
  const posInCol = (benchNo - 1) % columnBreak;
  const columnNo = colIdx + 1;

  if (numberingStyle === "SERPENTINE" && colIdx % 2 === 1) {
    return { columnNo, rowNo: columnBreak - posInCol };
  }
  return { columnNo, rowNo: posInCol + 1 };
}

/**
 * Pure TypeScript MSBTE Bench Arrangement Allocator
 */
export function allocateBenches(
  candidates: BenchCandidateInput[],
  blocks: BenchBlockInput[],
  options: BenchAllocatorOptions = {}
): BenchAllocatorOutput {
  const {
    keepPaperInSingleBlock = false,
    leaveEmptyBenches = 0,
    interleavePapers = false,
    lockedAllocations = [],
  } = options;

  const sortedBlocks = [...blocks].sort((a, b) => a.blockNo - b.blockNo);
  const lockedIds = new Set(lockedAllocations.map((a) => a.candidatePaperId));
  const lockedBlockIds = new Set(
    sortedBlocks.filter((b) => b.isLocked).map((b) => b.blockId)
  );

  // Exclude candidates already placed in locked blocks
  const remainingCandidates = candidates.filter((c) => !lockedIds.has(c.candidatePaperId));

  // Default order: timetable -> instCode -> seatNo ascending
  remainingCandidates.sort((a, b) => {
    if (a.timetableOrder !== b.timetableOrder) return a.timetableOrder - b.timetableOrder;
    const instCmp = a.instCode.localeCompare(b.instCode, undefined, { numeric: true });
    if (instCmp !== 0) return instCmp;
    return a.seatNo.localeCompare(b.seatNo, undefined, { numeric: true });
  });

  // Optional: interleave papers round-robin across different subjectCode/csm groups
  let orderedQueue: BenchCandidateInput[] = [];
  if (interleavePapers && remainingCandidates.length > 0) {
    const groups = new Map<string, BenchCandidateInput[]>();
    for (const c of remainingCandidates) {
      const key = `${c.subjectCode}_${c.csm}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }
    const groupArrays = Array.from(groups.values());
    let added = true;
    while (added) {
      added = false;
      for (const g of groupArrays) {
        if (g.length > 0) {
          orderedQueue.push(g.shift()!);
          added = true;
        }
      }
    }
  } else {
    orderedQueue = remainingCandidates;
  }

  const unlockedBlocks = sortedBlocks.filter((b) => !lockedBlockIds.has(b.blockId));
  const allocations: BenchAllocationResult[] = [...lockedAllocations];

  // Track next available benchNo per unlocked block
  const blockNextBench = new Map<string, number>();
  unlockedBlocks.forEach((b) => blockNextBench.set(b.blockId, 1));

  const getBlockUsableStrength = (b: BenchBlockInput) =>
    Math.max(0, b.strength - Math.max(0, leaveEmptyBenches));

  const unallocated: BenchCandidateInput[] = [];

  if (keepPaperInSingleBlock && !interleavePapers) {
    // Group by paper (subjectCode + csm) and try to fit each paper in a single block when possible
    const paperGroups: BenchCandidateInput[][] = [];
    const groupMap = new Map<string, BenchCandidateInput[]>();
    for (const c of orderedQueue) {
      const k = `${c.timetableOrder}_${c.subjectCode}_${c.csm}`;
      if (!groupMap.has(k)) {
        const arr: BenchCandidateInput[] = [];
        groupMap.set(k, arr);
        paperGroups.push(arr);
      }
      groupMap.get(k)!.push(c);
    }

    let currentBlockIdx = 0;
    for (const group of paperGroups) {
      // Find a block where the entire group fits in remaining space
      let targetBlock = unlockedBlocks.find((b) => {
        const nextB = blockNextBench.get(b.blockId) || 1;
        const remainingCap = getBlockUsableStrength(b) - (nextB - 1);
        return remainingCap >= group.length;
      });

      if (targetBlock) {
        for (const cand of group) {
          const benchNo = blockNextBench.get(targetBlock.blockId)!;
          const { columnNo, rowNo } = getBenchCoordinates(
            benchNo,
            targetBlock.columns,
            targetBlock.columnBreak,
            targetBlock.numberingStyle
          );
          allocations.push({
            blockId: targetBlock.blockId,
            blockNo: targetBlock.blockNo,
            candidatePaperId: cand.candidatePaperId,
            benchNo,
            columnNo,
            rowNo,
            seatNo: cand.seatNo,
            csm: cand.csm,
            instCode: cand.instCode,
            isDetained: cand.isDetained,
            isLocked: false,
          });
          blockNextBench.set(targetBlock.blockId, benchNo + 1);
        }
      } else {
        // Fallback: spill sequentially across blocks starting from currentBlockIdx
        for (const cand of group) {
          while (
            currentBlockIdx < unlockedBlocks.length &&
            (blockNextBench.get(unlockedBlocks[currentBlockIdx].blockId) || 1) >
              getBlockUsableStrength(unlockedBlocks[currentBlockIdx])
          ) {
            currentBlockIdx++;
          }
          if (currentBlockIdx >= unlockedBlocks.length) {
            unallocated.push(cand);
            continue;
          }
          const b = unlockedBlocks[currentBlockIdx];
          const benchNo = blockNextBench.get(b.blockId)!;
          const { columnNo, rowNo } = getBenchCoordinates(
            benchNo,
            b.columns,
            b.columnBreak,
            b.numberingStyle
          );
          allocations.push({
            blockId: b.blockId,
            blockNo: b.blockNo,
            candidatePaperId: cand.candidatePaperId,
            benchNo,
            columnNo,
            rowNo,
            seatNo: cand.seatNo,
            csm: cand.csm,
            instCode: cand.instCode,
            isDetained: cand.isDetained,
            isLocked: false,
          });
          blockNextBench.set(b.blockId, benchNo + 1);
        }
      }
    }
  } else {
    // Sequential block-by-block filling
    let blockIdx = 0;
    for (const cand of orderedQueue) {
      while (
        blockIdx < unlockedBlocks.length &&
        (blockNextBench.get(unlockedBlocks[blockIdx].blockId) || 1) >
          getBlockUsableStrength(unlockedBlocks[blockIdx])
      ) {
        blockIdx++;
      }

      if (blockIdx >= unlockedBlocks.length) {
        unallocated.push(cand);
        continue;
      }

      const b = unlockedBlocks[blockIdx];
      const benchNo = blockNextBench.get(b.blockId)!;
      const { columnNo, rowNo } = getBenchCoordinates(
        benchNo,
        b.columns,
        b.columnBreak,
        b.numberingStyle
      );

      allocations.push({
        blockId: b.blockId,
        blockNo: b.blockNo,
        candidatePaperId: cand.candidatePaperId,
        benchNo,
        columnNo,
        rowNo,
        seatNo: cand.seatNo,
        csm: cand.csm,
        instCode: cand.instCode,
        isDetained: cand.isDetained,
        isLocked: false,
      });
      blockNextBench.set(b.blockId, benchNo + 1);
    }
  }

  const usedBlocks = new Set(allocations.map((a) => a.blockId));

  return {
    allocations,
    unallocated,
    stats: {
      totalCandidates: candidates.length,
      allocatedCount: allocations.length,
      blocksUsed: usedBlocks.size,
      detainedCount: allocations.filter((a) => a.isDetained).length,
    },
  };
}
