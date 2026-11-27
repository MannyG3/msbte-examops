import { describe, it, expect } from "vitest";
import {
  allocateBenches,
  getBenchCoordinates,
  BenchBlockInput,
  BenchCandidateInput,
} from "./bench-allocator";

describe("MSBTE Serpentine Bench Allocator", () => {
  it("computes serpentine coordinates matching Section 3 (4 cols x 9 rows)", () => {
    // Col 1 top to bottom: bench 1 -> (col 1, row 1), bench 9 -> (col 1, row 9)
    expect(getBenchCoordinates(1, 4, 9, "SERPENTINE")).toEqual({ columnNo: 1, rowNo: 1 });
    expect(getBenchCoordinates(9, 4, 9, "SERPENTINE")).toEqual({ columnNo: 1, rowNo: 9 });

    // Col 2 bottom to top: bench 10 -> (col 2, row 9), bench 18 -> (col 2, row 1)
    expect(getBenchCoordinates(10, 4, 9, "SERPENTINE")).toEqual({ columnNo: 2, rowNo: 9 });
    expect(getBenchCoordinates(18, 4, 9, "SERPENTINE")).toEqual({ columnNo: 2, rowNo: 1 });

    // Col 4 bottom to top: bench 28 -> (col 4, row 9), bench 36 -> (col 4, row 1)
    expect(getBenchCoordinates(28, 4, 9, "SERPENTINE")).toEqual({ columnNo: 4, rowNo: 9 });
    expect(getBenchCoordinates(36, 4, 9, "SERPENTINE")).toEqual({ columnNo: 4, rowNo: 1 });
  });

  it("handles block overflow across multiple blocks and preserves ascending seat numbers", () => {
    const blocks: BenchBlockInput[] = [
      { blockId: "b1", blockNo: 1, roomNo: "F-11", columns: 4, columnBreak: 9, strength: 36, numberingStyle: "SERPENTINE" },
      { blockId: "b2", blockNo: 2, roomNo: "F-12", columns: 4, columnBreak: 9, strength: 36, numberingStyle: "SERPENTINE" },
    ];

    const candidates: BenchCandidateInput[] = Array.from({ length: 50 }, (_, i) => ({
      candidatePaperId: `cp_${i + 1}`,
      seatNo: String(250447 + i),
      instCode: "1227",
      csm: "CO-3-K",
      subjectCode: "313303",
      subjectName: "DIGITAL TECHNIQUES",
      abbreviation: "DTE",
      timeRange: "02:00 P.M. to 05:00 P.M.",
      timetableOrder: 1,
      isDetained: i === 2, // 1 detained candidate
    }));

    const res = allocateBenches(candidates, blocks);

    expect(res.stats.allocatedCount).toBe(50);
    expect(res.stats.blocksUsed).toBe(2);
    expect(res.stats.detainedCount).toBe(1);
    expect(res.unallocated).toHaveLength(0);

    const b1 = res.allocations.filter((a) => a.blockId === "b1");
    const b2 = res.allocations.filter((a) => a.blockId === "b2");
    expect(b1).toHaveLength(36);
    expect(b2).toHaveLength(14);
    expect(b1[0].seatNo).toBe("250447");
    expect(b1[35].seatNo).toBe("250482");
    expect(b2[0].seatNo).toBe("250483");
    expect(b1[2].isDetained).toBe(true);
  });

  it("interleaves mixed papers and respects leaveEmptyBenches", () => {
    const blocks: BenchBlockInput[] = [
      { blockId: "b1", blockNo: 1, roomNo: "F-11", columns: 2, columnBreak: 5, strength: 10, numberingStyle: "SERPENTINE" },
    ];

    const cands: BenchCandidateInput[] = [
      ...Array.from({ length: 4 }, (_, i) => ({
        candidatePaperId: `pA_${i}`,
        seatNo: String(100 + i),
        instCode: "9999",
        csm: "CO-3-K",
        subjectCode: "313303",
        subjectName: "DTE",
        abbreviation: "DTE",
        timeRange: "09:30 A.M. to 12:30 P.M.",
        timetableOrder: 1,
        isDetained: false,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        candidatePaperId: `pB_${i}`,
        seatNo: String(200 + i),
        instCode: "9999",
        csm: "IF-3-K",
        subjectCode: "313302",
        subjectName: "DMS",
        abbreviation: "DMS",
        timeRange: "09:30 A.M. to 12:30 P.M.",
        timetableOrder: 2,
        isDetained: false,
      })),
    ];

    const res = allocateBenches(cands, blocks, {
      interleavePapers: true,
      leaveEmptyBenches: 2, // usable = 8
    });

    expect(res.stats.allocatedCount).toBe(8);
    expect(res.allocations[0].csm).toBe("CO-3-K");
    expect(res.allocations[1].csm).toBe("IF-3-K");
    expect(res.allocations[2].csm).toBe("CO-3-K");
  });
});
