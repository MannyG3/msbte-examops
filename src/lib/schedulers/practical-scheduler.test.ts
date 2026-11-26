import { generatePracticalSchedule, PracticalTaskInput, PracticalLabInput, PracticalStaffInput } from "./practical-scheduler";

function runTests() {
  console.log("=== Testing MSBTE Practical Timetable Generator ===");

  const tasks: PracticalTaskInput[] = [
    { courseId: "c1", courseCode: "315319", courseTitle: "OSY", semester: 5, divisionId: "d5", divisionName: "A", batchId: "b5_1", batchName: "A1", studentCount: 20, isExternal: true },
    { courseId: "c1", courseCode: "315319", courseTitle: "OSY", semester: 5, divisionId: "d5", divisionName: "A", batchId: "b5_2", batchName: "A2", studentCount: 20, isExternal: true },
    { courseId: "c2", courseCode: "315320", courseTitle: "AJP", semester: 5, divisionId: "d5", divisionName: "A", batchId: "b5_1", batchName: "A1", studentCount: 20, isExternal: true },
    { courseId: "c3", courseCode: "311305", courseTitle: "ICT", semester: 1, divisionId: "d1", divisionName: "A", batchId: "b1_1", batchName: "A1", studentCount: 20, isExternal: false },
  ];

  const labs: PracticalLabInput[] = [
    { roomId: "lab1", roomName: "Network Lab", capacity: 30, equipmentCount: 30 },
    { roomId: "lab2", roomName: "Software Lab", capacity: 30, equipmentCount: 30 },
  ];

  const staff: PracticalStaffInput[] = [
    { staffId: "st1", name: "Prof. A", teachingCourseIds: ["c1"] },
    { staffId: "st2", name: "Prof. B", teachingCourseIds: ["c2"] },
    { staffId: "st3", name: "Prof. C", teachingCourseIds: ["c3"] },
  ];

  const res = generatePracticalSchedule(tasks, labs, staff, {
    mainWindow: { startDate: "2026-10-21", endDate: "2026-10-31" },
    sem1Window: { startDate: "2026-11-02", endDate: "2026-11-06" },
  });

  console.log("Total tasks:", res.stats.totalTasks);
  console.log("Scheduled:", res.stats.scheduledCount);
  console.log("Sundays skipped:", res.stats.sundaysSkipped);

  if (res.stats.scheduledCount !== 4) {
    throw new Error(`Expected 4 scheduled slots, got ${res.stats.scheduledCount}`);
  }

  // Verify Sem 1 ICT is scheduled in Nov 2-6 window
  const sem1Slot = res.slots.find((s) => s.semester === 1);
  if (!sem1Slot || sem1Slot.examDate < "2026-11-02" || sem1Slot.examDate > "2026-11-06") {
    throw new Error("Sem 1 practical was not scheduled inside Sem 1 window!");
  }

  // Verify no Sunday scheduled
  const sundaySlot = res.slots.find((s) => new Date(s.examDate).getDay() === 0);
  if (sundaySlot) {
    throw new Error("Sunday was scheduled!");
  }

  console.log("✓ All Practical Scheduler Unit Tests Passed!");
}

runTests();
