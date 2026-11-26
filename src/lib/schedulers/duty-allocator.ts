export interface DutySlotRoom {
  roomId: string;
  roomName: string;
  studentCount: number;
}

export interface DutySessionSlotInput {
  date: string; // YYYY-MM-DD
  slot: "MORNING" | "AFTERNOON";
  rooms: DutySlotRoom[];
  courseIds: string[]; // Courses being examined in this slot
}

export interface DutyStaffInput {
  staffId: string;
  name: string;
  designation: string;
  type: "TEACHING" | "LAB_ASSISTANT" | "PEON";
  maxDuties: number;
  teachingCourseIds: string[];
  unavailableDates?: string[];
}

export interface AllocatedDutyOutput {
  date: string;
  slot: "MORNING" | "AFTERNOON";
  roomId: string | null;
  roomName: string | null;
  staffId: string;
  staffName: string;
  role: "SENIOR_SUPERVISOR" | "JUNIOR_SUPERVISOR" | "RELIEVER" | "PEON";
}

export interface StaffLoadSummary {
  staffId: string;
  name: string;
  type: string;
  assignedCount: number;
  maxDuties: number;
}

export interface DutyAllocationResult {
  duties: AllocatedDutyOutput[];
  staffLoadSummary: StaffLoadSummary[];
  unfilledPositions: { date: string; slot: string; role: string; reason: string }[];
  stats: {
    totalDutiesAssigned: number;
    backToBackCount: number;
    subjectConflictsAvoided: number;
  };
}

/**
 * Pure TypeScript Fair Supervision Duty Allocator
 */
export function allocateSupervisionDuties(
  slots: DutySessionSlotInput[],
  staffList: DutyStaffInput[],
  options: {
    studentsPerSupervisor?: number;
    assignRelievers?: boolean;
    assignSeniorSupervisor?: boolean;
    assignPeons?: boolean;
  } = {}
): DutyAllocationResult {
  const studentsPerSupervisor = options.studentsPerSupervisor || 30;
  const assignRelievers = options.assignRelievers !== false;
  const assignSeniorSupervisor = options.assignSeniorSupervisor !== false;
  const assignPeons = options.assignPeons !== false;

  const assignedCountMap = new Map<string, number>();
  const staffSlotBusyMap = new Map<string, Set<string>>(); // staffId -> Set("YYYY-MM-DD_SLOT")
  const staffDateBusyMap = new Map<string, Set<string>>(); // staffId -> Set("YYYY-MM-DD")

  staffList.forEach((s) => {
    assignedCountMap.set(s.staffId, 0);
    staffSlotBusyMap.set(s.staffId, new Set());
    staffDateBusyMap.set(s.staffId, new Set());
  });

  const duties: AllocatedDutyOutput[] = [];
  const unfilledPositions: { date: string; slot: string; role: string; reason: string }[] = [];
  let backToBackCount = 0;
  let subjectConflictsAvoided = 0;

  function pickBestStaff(
    date: string,
    slot: "MORNING" | "AFTERNOON",
    eligibleTypes: string[],
    slotCourseIds: string[],
    checkSubjectConflict: boolean
  ): DutyStaffInput | null {
    const slotKey = `${date}_${slot}`;

    const candidates = staffList.filter((s) => {
      if (!eligibleTypes.includes(s.type)) return false;
      if ((assignedCountMap.get(s.staffId) || 0) >= s.maxDuties) return false;
      if (staffSlotBusyMap.get(s.staffId)?.has(slotKey)) return false;
      if (s.unavailableDates?.includes(date)) return false;

      if (checkSubjectConflict) {
        const hasConflict = s.teachingCourseIds.some((cId) => slotCourseIds.includes(cId));
        if (hasConflict) {
          subjectConflictsAvoided++;
          return false;
        }
      }
      return true;
    });

    if (candidates.length === 0) return null;

    // Sort candidates:
    // 1. Prefer staff NOT already working on this same date (avoid back-to-back M & A)
    // 2. Lowest assignedCount (fair load distribution)
    candidates.sort((a, b) => {
      const aBusyToday = staffDateBusyMap.get(a.staffId)?.has(date) ? 1 : 0;
      const bBusyToday = staffDateBusyMap.get(b.staffId)?.has(date) ? 1 : 0;
      if (aBusyToday !== bBusyToday) return aBusyToday - bBusyToday;

      const aCount = assignedCountMap.get(a.staffId) || 0;
      const bCount = assignedCountMap.get(b.staffId) || 0;
      return aCount - bCount;
    });

    const chosen = candidates[0];
    if (chosen.type === "TEACHING" && staffDateBusyMap.get(chosen.staffId)?.has(date)) {
      backToBackCount++;
    }

    assignedCountMap.set(chosen.staffId, (assignedCountMap.get(chosen.staffId) || 0) + 1);
    staffSlotBusyMap.get(chosen.staffId)?.add(slotKey);
    staffDateBusyMap.get(chosen.staffId)?.add(date);

    return chosen;
  }

  for (const s of slots) {
    if (s.rooms.length === 0) continue;

    // 1. Senior Supervisor (1 per slot)
    if (assignSeniorSupervisor) {
      const senior = pickBestStaff(s.date, s.slot, ["TEACHING"], s.courseIds, false);
      if (senior) {
        duties.push({
          date: s.date,
          slot: s.slot,
          roomId: null,
          roomName: "Control Room",
          staffId: senior.staffId,
          staffName: senior.name,
          role: "SENIOR_SUPERVISOR",
        });
      } else {
        unfilledPositions.push({
          date: s.date,
          slot: s.slot,
          role: "SENIOR_SUPERVISOR",
          reason: "No eligible teaching staff available",
        });
      }
    }

    // 2. Junior Supervisors (1 per room, or more if studentCount > studentsPerSupervisor)
    for (const room of s.rooms) {
      const supervisorsNeeded = Math.max(1, Math.ceil(room.studentCount / studentsPerSupervisor));
      for (let i = 0; i < supervisorsNeeded; i++) {
        const js = pickBestStaff(s.date, s.slot, ["TEACHING"], s.courseIds, true);
        if (js) {
          duties.push({
            date: s.date,
            slot: s.slot,
            roomId: room.roomId,
            roomName: room.roomName,
            staffId: js.staffId,
            staffName: js.name,
            role: "JUNIOR_SUPERVISOR",
          });
        } else {
          unfilledPositions.push({
            date: s.date,
            slot: s.slot,
            role: `JUNIOR_SUPERVISOR (${room.roomName})`,
            reason: "Insufficient eligible teaching staff without subject conflict",
          });
        }
      }
    }

    // 3. Relievers (1 per 4 rooms, min 1)
    if (assignRelievers) {
      const relieversNeeded = Math.max(1, Math.floor(s.rooms.length / 4));
      for (let i = 0; i < relieversNeeded; i++) {
        const reliever = pickBestStaff(s.date, s.slot, ["TEACHING", "LAB_ASSISTANT"], s.courseIds, true);
        if (reliever) {
          duties.push({
            date: s.date,
            slot: s.slot,
            roomId: null,
            roomName: "Floor Reliever",
            staffId: reliever.staffId,
            staffName: reliever.name,
            role: "RELIEVER",
          });
        }
      }
    }

    // 4. Peons (1 per slot)
    if (assignPeons) {
      const peon = pickBestStaff(s.date, s.slot, ["PEON"], s.courseIds, false);
      if (peon) {
        duties.push({
          date: s.date,
          slot: s.slot,
          roomId: null,
          roomName: "Floor Support",
          staffId: peon.staffId,
          staffName: peon.name,
          role: "PEON",
        });
      }
    }
  }

  const staffLoadSummary: StaffLoadSummary[] = staffList.map((st) => ({
    staffId: st.staffId,
    name: st.name,
    type: st.type,
    assignedCount: assignedCountMap.get(st.staffId) || 0,
    maxDuties: st.maxDuties,
  }));

  return {
    duties,
    staffLoadSummary,
    unfilledPositions,
    stats: {
      totalDutiesAssigned: duties.length,
      backToBackCount,
      subjectConflictsAvoided,
    },
  };
}
