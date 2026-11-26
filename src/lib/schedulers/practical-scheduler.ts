export interface PracticalTaskInput {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  semester: number;
  divisionId: string;
  divisionName: string;
  batchId: string;
  batchName: string;
  studentCount: number;
  isExternal: boolean;
}

export interface PracticalLabInput {
  roomId: string;
  roomName: string;
  capacity: number;
  equipmentCount?: number | null;
}

export interface PracticalStaffInput {
  staffId: string;
  name: string;
  teachingCourseIds: string[];
}

export interface PracticalWindow {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface PracticalSlotOutput {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  semester: number;
  divisionId: string;
  divisionName: string;
  batchId: string;
  batchName: string;
  roomId: string;
  roomName: string;
  examDate: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  internalExaminerId: string;
  internalExaminerName: string;
  isExternal: boolean;
}

export interface PracticalScheduleResult {
  slots: PracticalSlotOutput[];
  unscheduledTasks: PracticalTaskInput[];
  stats: {
    totalTasks: number;
    scheduledCount: number;
    sundaysSkipped: number;
  };
}

const DEFAULT_TIME_SLOTS = [
  { startTime: "10:00 AM", endTime: "01:00 PM" },
  { startTime: "02:00 PM", endTime: "05:00 PM" },
];

function getValidDates(startStr: string, endStr: string, holidays: string[]): { dates: string[]; sundaysSkipped: number } {
  const dates: string[] = [];
  let sundaysSkipped = 0;
  const current = new Date(startStr);
  const end = new Date(endStr);

  while (current <= end) {
    const iso = current.toISOString().split("T")[0];
    if (current.getDay() === 0) {
      sundaysSkipped++;
    } else if (!holidays.includes(iso)) {
      dates.push(iso);
    }
    current.setDate(current.getDate() + 1);
  }
  return { dates, sundaysSkipped };
}

/**
 * Pure TypeScript Clash-Free Practical Timetable Generator
 */
export function generatePracticalSchedule(
  tasks: PracticalTaskInput[],
  labs: PracticalLabInput[],
  staffList: PracticalStaffInput[],
  windows: {
    mainWindow: PracticalWindow;
    sem1Window?: PracticalWindow;
  },
  holidays: string[] = []
): PracticalScheduleResult {
  const mainDatesInfo = getValidDates(windows.mainWindow.startDate, windows.mainWindow.endDate, holidays);
  const sem1DatesInfo = windows.sem1Window
    ? getValidDates(windows.sem1Window.startDate, windows.sem1Window.endDate, holidays)
    : mainDatesInfo;

  // Busy trackers keyed by "YYYY-MM-DD_STARTTIME"
  const batchBusy = new Set<string>();
  const labBusy = new Set<string>();
  const staffBusy = new Set<string>();

  const scheduledSlots: PracticalSlotOutput[] = [];
  const unscheduledTasks: PracticalTaskInput[] = [];

  // Sort tasks: Sem 3 & 5 first, then Sem 1, grouped by course
  const sortedTasks = [...tasks].sort((a, b) => a.semester - b.semester || a.courseCode.localeCompare(b.courseCode));

  for (const task of sortedTasks) {
    const validDates = task.semester === 1 ? sem1DatesInfo.dates : mainDatesInfo.dates;
    let placed = false;

    // Pick eligible internal examiners (prefer those who teach this course)
    const preferredStaff = staffList.filter((s) => s.teachingCourseIds.includes(task.courseId));
    const otherStaff = staffList.filter((s) => !s.teachingCourseIds.includes(task.courseId));
    const orderedStaff = [...preferredStaff, ...otherStaff];

    for (const date of validDates) {
      if (placed) break;

      for (const ts of DEFAULT_TIME_SLOTS) {
        if (placed) break;
        const slotKey = `${date}_${ts.startTime}`;

        // 1. Check batch availability
        if (batchBusy.has(`${task.batchId}_${slotKey}`)) continue;

        // 2. Find available lab with enough capacity
        const availableLab = labs.find((lab) => {
          const cap = lab.equipmentCount || lab.capacity;
          return cap >= task.studentCount && !labBusy.has(`${lab.roomId}_${slotKey}`);
        });
        if (!availableLab) continue;

        // 3. Find available internal examiner
        const availableStaff = orderedStaff.find((st) => !staffBusy.has(`${st.staffId}_${slotKey}`));
        if (!availableStaff) continue;

        // Assign!
        batchBusy.add(`${task.batchId}_${slotKey}`);
        labBusy.add(`${availableLab.roomId}_${slotKey}`);
        staffBusy.add(`${availableStaff.staffId}_${slotKey}`);

        scheduledSlots.push({
          courseId: task.courseId,
          courseCode: task.courseCode,
          courseTitle: task.courseTitle,
          semester: task.semester,
          divisionId: task.divisionId,
          divisionName: task.divisionName,
          batchId: task.batchId,
          batchName: task.batchName,
          roomId: availableLab.roomId,
          roomName: availableLab.roomName,
          examDate: date,
          startTime: ts.startTime,
          endTime: ts.endTime,
          internalExaminerId: availableStaff.staffId,
          internalExaminerName: availableStaff.name,
          isExternal: task.isExternal,
        });

        placed = true;
      }
    }

    if (!placed) {
      unscheduledTasks.push(task);
    }
  }

  return {
    slots: scheduledSlots,
    unscheduledTasks,
    stats: {
      totalTasks: tasks.length,
      scheduledCount: scheduledSlots.length,
      sundaysSkipped: mainDatesInfo.sundaysSkipped,
    },
  };
}
