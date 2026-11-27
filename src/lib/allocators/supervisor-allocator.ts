export interface StaffInput {
  id: string;
  name: string;
  designation: string;
  department: string;
  type: string; // TEACHING, LAB_ASSISTANT, PEON
  subjectsTaught: string[];
  maxDutiesPerSession: number;
  unavailableDates: string[]; // YYYY-MM-DD
}

export interface ActiveBlockInput {
  blockId: string;
  blockNo: number;
  roomNo: string;
  building: string;
  floor: number;
  subjectCodes: string[]; // subject codes seated in this block for this day+slot
}

export interface ExistingDutyInput {
  staffId: string;
  examDay: number;
  examDate: string; // YYYY-MM-DD
  slot: "MORNING" | "AFTERNOON";
  blockId: string | null;
  role: "JUNIOR" | "RELIEVER" | "SENIOR";
  isOverride: boolean;
}

export interface SupervisionSlotInput {
  examDay: number;
  examDate: string; // YYYY-MM-DD
  slot: "MORNING" | "AFTERNOON";
  activeBlocks: ActiveBlockInput[];
  allSubjectCodes: string[];
}

export interface SupervisorAllocationOptions {
  relieversPerNBlocks?: number; // default 4
  seniorCount?: number; // default 1
  avoidOwnSubject?: boolean; // default true
  avoidBackToBack?: boolean; // default true
  eligibleTypes?: string[]; // default ["TEACHING"]
}

export interface AllocatedDuty {
  examDay: number;
  examDate: string;
  slot: "MORNING" | "AFTERNOON";
  blockId: string | null;
  staffId: string;
  role: "JUNIOR" | "RELIEVER" | "SENIOR";
  isOverride: boolean;
}

export interface StaffLoadSummary {
  staffId: string;
  name: string;
  department: string;
  maxDutiesPerSession: number;
  totalDuties: number;
  juniorCount: number;
  relieverCount: number;
  seniorCount: number;
}

export interface SupervisionAllocationResult {
  duties: AllocatedDuty[];
  staffLoad: StaffLoadSummary[];
  unfilledSlots: Array<{
    examDay: number;
    slot: string;
    role: string;
    blockNo?: number;
    reason: string;
  }>;
}

/**
 * Fairly allocates Junior Supervisors (1 per active block), Relievers (1 per N blocks),
 * and Senior Supervisors across one or more exam day+slot sessions.
 *
 * Respects:
 * - Manual overrides (preserved as-is)
 * - Staff unavailability dates (YYYY-MM-DD)
 * - Max duties per session
 * - Equal load distribution (fewest total duties first)
 * - Avoids assigning teachers to their own subject's block/paper (when alternatives exist)
 * - Avoids back-to-back Morning + Afternoon duties on the same day (when alternatives exist)
 */
export function allocateSupervisors(
  staffList: StaffInput[],
  slots: SupervisionSlotInput[],
  existingLockedOrOtherDuties: ExistingDutyInput[] = [],
  options: SupervisorAllocationOptions = {}
): SupervisionAllocationResult {
  const relieversPerNBlocks = Math.max(1, options.relieversPerNBlocks ?? 4);
  const seniorCount = Math.max(0, options.seniorCount ?? 1);
  const avoidOwnSubject = options.avoidOwnSubject ?? true;
  const avoidBackToBack = options.avoidBackToBack ?? true;
  const eligibleTypes = new Set(options.eligibleTypes ?? ["TEACHING"]);

  const eligibleStaff = staffList.filter((s) => eligibleTypes.has(s.type));

  // Track cumulative counts per staffId
  const totalCount = new Map<string, number>();
  const roleCounts = new Map<string, { JUNIOR: number; RELIEVER: number; SENIOR: number }>();
  const dutiesOnDaySlot = new Map<string, Set<string>>(); // `${examDay}:${slot}` -> Set<staffId>
  const dutiesOnDay = new Map<number, Set<string>>(); // examDay -> Set<staffId>

  for (const s of staffList) {
    totalCount.set(s.id, 0);
    roleCounts.set(s.id, { JUNIOR: 0, RELIEVER: 0, SENIOR: 0 });
  }

  const duties: AllocatedDuty[] = [];
  const unfilledSlots: SupervisionAllocationResult["unfilledSlots"] = [];

  const recordDuty = (d: AllocatedDuty) => {
    duties.push(d);
    totalCount.set(d.staffId, (totalCount.get(d.staffId) ?? 0) + 1);
    const rc = roleCounts.get(d.staffId);
    if (rc) rc[d.role] += 1;

    const dsKey = `${d.examDay}:${d.slot}`;
    if (!dutiesOnDaySlot.has(dsKey)) dutiesOnDaySlot.set(dsKey, new Set());
    dutiesOnDaySlot.get(dsKey)!.add(d.staffId);

    if (!dutiesOnDay.has(d.examDay)) dutiesOnDay.set(d.examDay, new Set());
    dutiesOnDay.get(d.examDay)!.add(d.staffId);
  };

  // Seed counts from existing duties (e.g. other days/slots or manual overrides)
  const overrideBySlotBlock = new Map<string, ExistingDutyInput>();
  const overrideRelieversBySlot = new Map<string, ExistingDutyInput[]>();
  const overrideSeniorsBySlot = new Map<string, ExistingDutyInput[]>();

  const targetSlotKeys = new Set(slots.map((s) => `${s.examDay}:${s.slot}`));

  for (const ex of existingLockedOrOtherDuties) {
    const dsKey = `${ex.examDay}:${ex.slot}`;
    if (targetSlotKeys.has(dsKey)) {
      if (ex.isOverride) {
        recordDuty({
          examDay: ex.examDay,
          examDate: ex.examDate,
          slot: ex.slot,
          blockId: ex.blockId,
          staffId: ex.staffId,
          role: ex.role,
          isOverride: true,
        });
        if (ex.role === "JUNIOR" && ex.blockId) {
          overrideBySlotBlock.set(`${dsKey}:${ex.blockId}`, ex);
        } else if (ex.role === "RELIEVER") {
          const list = overrideRelieversBySlot.get(dsKey) ?? [];
          list.push(ex);
          overrideRelieversBySlot.set(dsKey, list);
        } else if (ex.role === "SENIOR") {
          const list = overrideSeniorsBySlot.get(dsKey) ?? [];
          list.push(ex);
          overrideSeniorsBySlot.set(dsKey, list);
        }
      }
    } else {
      // Duty from another day/slot not being regenerated: count toward load & same-day tracking
      totalCount.set(ex.staffId, (totalCount.get(ex.staffId) ?? 0) + 1);
      const rc = roleCounts.get(ex.staffId);
      if (rc) rc[ex.role] += 1;
      if (!dutiesOnDaySlot.has(dsKey)) dutiesOnDaySlot.set(dsKey, new Set());
      dutiesOnDaySlot.get(dsKey)!.add(ex.staffId);
      if (!dutiesOnDay.has(ex.examDay)) dutiesOnDay.set(ex.examDay, new Set());
      dutiesOnDay.get(ex.examDay)!.add(ex.staffId);
    }
  }

  const pickBestCandidate = (
    examDay: number,
    examDate: string,
    slot: "MORNING" | "AFTERNOON",
    blockSubjectCodes: string[]
  ): StaffInput | null => {
    const dsKey = `${examDay}:${slot}`;
    const alreadyInSlot = dutiesOnDaySlot.get(dsKey) ?? new Set<string>();
    const alreadyOnDay = dutiesOnDay.get(examDay) ?? new Set<string>();
    const subjectSet = new Set(blockSubjectCodes);

    // Hard filter: eligible, not already assigned in this day+slot, not unavailable, under maxDuties
    const candidates = eligibleStaff.filter((s) => {
      if (alreadyInSlot.has(s.id)) return false;
      if (s.unavailableDates.includes(examDate)) return false;
      if ((totalCount.get(s.id) ?? 0) >= s.maxDutiesPerSession) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    // Score candidates: lower is better
    candidates.sort((a, b) => {
      const aOwnSub = avoidOwnSubject && a.subjectsTaught.some((sc) => subjectSet.has(sc)) ? 1 : 0;
      const bOwnSub = avoidOwnSubject && b.subjectsTaught.some((sc) => subjectSet.has(sc)) ? 1 : 0;
      if (aOwnSub !== bOwnSub) return aOwnSub - bOwnSub;

      const aSameDay = avoidBackToBack && alreadyOnDay.has(a.id) ? 1 : 0;
      const bSameDay = avoidBackToBack && alreadyOnDay.has(b.id) ? 1 : 0;
      if (aSameDay !== bSameDay) return aSameDay - bSameDay;

      const aLoad = totalCount.get(a.id) ?? 0;
      const bLoad = totalCount.get(b.id) ?? 0;
      if (aLoad !== bLoad) return aLoad - bLoad;

      return a.name.localeCompare(b.name);
    });

    return candidates[0];
  };

  // Sort slots chronologically
  const sortedSlots = [...slots].sort((a, b) => {
    if (a.examDay !== b.examDay) return a.examDay - b.examDay;
    return a.slot === "MORNING" ? -1 : 1;
  });

  for (const s of sortedSlots) {
    if (s.activeBlocks.length === 0) continue;
    const dsKey = `${s.examDay}:${s.slot}`;

    // 1. Senior Supervisors
    const existingSeniors = overrideSeniorsBySlot.get(dsKey)?.length ?? 0;
    for (let i = existingSeniors; i < seniorCount; i++) {
      const picked = pickBestCandidate(s.examDay, s.examDate, s.slot, []);
      if (!picked) {
        unfilledSlots.push({
          examDay: s.examDay,
          slot: s.slot,
          role: "SENIOR",
          reason: "No eligible staff remaining under max duties / availability",
        });
      } else {
        recordDuty({
          examDay: s.examDay,
          examDate: s.examDate,
          slot: s.slot,
          blockId: null,
          staffId: picked.id,
          role: "SENIOR",
          isOverride: false,
        });
      }
    }

    // 2. Junior Supervisors (1 per active block)
    const sortedBlocks = [...s.activeBlocks].sort((a, b) => a.blockNo - b.blockNo);
    for (const blk of sortedBlocks) {
      if (overrideBySlotBlock.has(`${dsKey}:${blk.blockId}`)) continue;
      const picked = pickBestCandidate(s.examDay, s.examDate, s.slot, blk.subjectCodes);
      if (!picked) {
        unfilledSlots.push({
          examDay: s.examDay,
          slot: s.slot,
          role: "JUNIOR",
          blockNo: blk.blockNo,
          reason: "No eligible staff remaining under max duties / availability",
        });
      } else {
        recordDuty({
          examDay: s.examDay,
          examDate: s.examDate,
          slot: s.slot,
          blockId: blk.blockId,
          staffId: picked.id,
          role: "JUNIOR",
          isOverride: false,
        });
      }
    }

    // 3. Relievers (1 per N active blocks)
    const requiredRelievers = Math.ceil(sortedBlocks.length / relieversPerNBlocks);
    const existingRelievers = overrideRelieversBySlot.get(dsKey)?.length ?? 0;
    for (let i = existingRelievers; i < requiredRelievers; i++) {
      const picked = pickBestCandidate(s.examDay, s.examDate, s.slot, []);
      if (!picked) {
        unfilledSlots.push({
          examDay: s.examDay,
          slot: s.slot,
          role: "RELIEVER",
          reason: "No eligible staff remaining under max duties / availability",
        });
      } else {
        recordDuty({
          examDay: s.examDay,
          examDate: s.examDate,
          slot: s.slot,
          blockId: null,
          staffId: picked.id,
          role: "RELIEVER",
          isOverride: false,
        });
      }
    }
  }

  const staffLoad: StaffLoadSummary[] = staffList.map((st) => {
    const rc = roleCounts.get(st.id) ?? { JUNIOR: 0, RELIEVER: 0, SENIOR: 0 };
    return {
      staffId: st.id,
      name: st.name,
      department: st.department,
      maxDutiesPerSession: st.maxDutiesPerSession,
      totalDuties: totalCount.get(st.id) ?? 0,
      juniorCount: rc.JUNIOR,
      relieverCount: rc.RELIEVER,
      seniorCount: rc.SENIOR,
    };
  });

  return { duties, staffLoad, unfilledSlots };
}
