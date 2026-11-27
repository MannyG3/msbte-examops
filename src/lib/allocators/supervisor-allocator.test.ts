import { describe, it, expect } from "vitest";
import { allocateSupervisors, StaffInput, SupervisionSlotInput } from "./supervisor-allocator";

function makeStaff(count: number): StaffInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `st-${i + 1}`,
    name: `Prof. Staff ${String(i + 1).padStart(2, "0")}`,
    designation: "Lecturer",
    department: i % 2 === 0 ? "CO" : "ME",
    type: "TEACHING",
    subjectsTaught: i === 0 ? ["313303"] : [],
    maxDutiesPerSession: 10,
    unavailableDates: i === 1 ? ["2026-11-10"] : [],
  }));
}

describe("Supervisor Allocator", () => {
  it("distributes Junior, Reliever, and Senior duties fairly and respects unavailability", () => {
    const staff = makeStaff(12);
    const slots: SupervisionSlotInput[] = [
      {
        examDay: 1,
        examDate: "2026-11-10",
        slot: "MORNING",
        allSubjectCodes: ["313303"],
        activeBlocks: [
          { blockId: "b1", blockNo: 1, roomNo: "F-11", building: "Main", floor: 1, subjectCodes: ["313303"] },
          { blockId: "b2", blockNo: 2, roomNo: "F-12", building: "Main", floor: 1, subjectCodes: ["313303"] },
          { blockId: "b3", blockNo: 3, roomNo: "F-13", building: "Main", floor: 1, subjectCodes: ["313303"] },
          { blockId: "b4", blockNo: 4, roomNo: "F-14", building: "Main", floor: 1, subjectCodes: ["313303"] },
        ],
      },
    ];

    const res = allocateSupervisors(staff, slots, [], {
      relieversPerNBlocks: 4,
      seniorCount: 1,
    });

    expect(res.unfilledSlots).toHaveLength(0);
    // 4 Junior + 1 Reliever + 1 Senior = 6 duties
    expect(res.duties).toHaveLength(6);
    expect(res.duties.filter((d) => d.role === "JUNIOR")).toHaveLength(4);
    expect(res.duties.filter((d) => d.role === "RELIEVER")).toHaveLength(1);
    expect(res.duties.filter((d) => d.role === "SENIOR")).toHaveLength(1);

    // st-2 is unavailable on 2026-11-10
    expect(res.duties.some((d) => d.staffId === "st-2")).toBe(false);

    // st-1 teaches 313303, so should NOT be assigned as JUNIOR to blocks with 313303 when others are free
    const juniorAssigned = res.duties.filter((d) => d.role === "JUNIOR").map((d) => d.staffId);
    expect(juniorAssigned).not.toContain("st-1");
  });

  it("avoids back-to-back Morning and Afternoon duties on the same day when alternatives exist", () => {
    const staff = makeStaff(10);
    const slots: SupervisionSlotInput[] = [
      {
        examDay: 2,
        examDate: "2026-11-11",
        slot: "MORNING",
        allSubjectCodes: ["22516"],
        activeBlocks: [
          { blockId: "b1", blockNo: 1, roomNo: "F-11", building: "Main", floor: 1, subjectCodes: ["22516"] },
          { blockId: "b2", blockNo: 2, roomNo: "F-12", building: "Main", floor: 1, subjectCodes: ["22516"] },
        ],
      },
      {
        examDay: 2,
        examDate: "2026-11-11",
        slot: "AFTERNOON",
        allSubjectCodes: ["22517"],
        activeBlocks: [
          { blockId: "b1", blockNo: 1, roomNo: "F-11", building: "Main", floor: 1, subjectCodes: ["22517"] },
          { blockId: "b2", blockNo: 2, roomNo: "F-12", building: "Main", floor: 1, subjectCodes: ["22517"] },
        ],
      },
    ];

    const res = allocateSupervisors(staff, slots, [], {
      relieversPerNBlocks: 4,
      seniorCount: 1,
    });

    const morningStaff = new Set(res.duties.filter((d) => d.slot === "MORNING").map((d) => d.staffId));
    const afternoonStaff = res.duties.filter((d) => d.slot === "AFTERNOON").map((d) => d.staffId);

    // 10 staff available, 4 duties per slot -> zero overlap between Morning & Afternoon
    for (const sId of afternoonStaff) {
      expect(morningStaff.has(sId)).toBe(false);
    }
  });

  it("respects maxDutiesPerSession and preserves manual overrides", () => {
    const staff = makeStaff(3).map((s) => ({ ...s, maxDutiesPerSession: 1 }));
    const slots: SupervisionSlotInput[] = [
      {
        examDay: 3,
        examDate: "2026-11-12",
        slot: "MORNING",
        allSubjectCodes: [],
        activeBlocks: [
          { blockId: "b1", blockNo: 1, roomNo: "F-11", building: "Main", floor: 1, subjectCodes: [] },
          { blockId: "b2", blockNo: 2, roomNo: "F-12", building: "Main", floor: 1, subjectCodes: [] },
        ],
      },
      {
        examDay: 4,
        examDate: "2026-11-13",
        slot: "MORNING",
        allSubjectCodes: [],
        activeBlocks: [
          { blockId: "b1", blockNo: 1, roomNo: "F-11", building: "Main", floor: 1, subjectCodes: [] },
        ],
      },
    ];

    const res = allocateSupervisors(
      staff,
      slots,
      [
        {
          staffId: "st-3",
          examDay: 3,
          examDate: "2026-11-12",
          slot: "MORNING",
          blockId: "b1",
          role: "JUNIOR",
          isOverride: true,
        },
      ],
      { relieversPerNBlocks: 4, seniorCount: 0 }
    );

    // Override preserved on b1
    expect(res.duties.find((d) => d.examDay === 3 && d.blockId === "b1")?.staffId).toBe("st-3");
    // Every staff member has at most 1 duty
    for (const load of res.staffLoad) {
      expect(load.totalDuties).toBeLessThanOrEqual(1);
    }
  });
});
