import { allocateSupervisionDuties, DutySessionSlotInput, DutyStaffInput } from "./duty-allocator";

function runTests() {
  console.log("=== Testing MSBTE Fair Supervision Duty Allocator ===");

  const slots: DutySessionSlotInput[] = [
    {
      date: "2026-11-17",
      slot: "MORNING",
      courseIds: ["c_osy"],
      rooms: [
        { roomId: "r1", roomName: "Room 101", studentCount: 30 },
        { roomId: "r2", roomName: "Room 102", studentCount: 30 },
      ],
    },
    {
      date: "2026-11-17",
      slot: "AFTERNOON",
      courseIds: ["c_pic"],
      rooms: [
        { roomId: "r1", roomName: "Room 101", studentCount: 30 },
        { roomId: "r2", roomName: "Room 102", studentCount: 30 },
      ],
    },
  ];

  const staff: DutyStaffInput[] = [
    { staffId: "st1", name: "Prof. OSY Teacher", designation: "Lecturer", type: "TEACHING", maxDuties: 5, teachingCourseIds: ["c_osy"] },
    { staffId: "st2", name: "Prof. PIC Teacher", designation: "Lecturer", type: "TEACHING", maxDuties: 5, teachingCourseIds: ["c_pic"] },
    { staffId: "st3", name: "Prof. A", designation: "Lecturer", type: "TEACHING", maxDuties: 5, teachingCourseIds: [] },
    { staffId: "st4", name: "Prof. B", designation: "Lecturer", type: "TEACHING", maxDuties: 5, teachingCourseIds: [] },
    { staffId: "st5", name: "Prof. C", designation: "Lecturer", type: "TEACHING", maxDuties: 5, teachingCourseIds: [] },
    { staffId: "st6", name: "Prof. D", designation: "Lecturer", type: "TEACHING", maxDuties: 5, teachingCourseIds: [] },
    { staffId: "st7", name: "Prof. E", designation: "Lecturer", type: "TEACHING", maxDuties: 5, teachingCourseIds: [] },
    { staffId: "st8", name: "Prof. F", designation: "Lecturer", type: "TEACHING", maxDuties: 5, teachingCourseIds: [] },
    { staffId: "p1", name: "Peon 1", designation: "Peon", type: "PEON", maxDuties: 5, teachingCourseIds: [] },
  ];

  const res = allocateSupervisionDuties(slots, staff);

  console.log("Total duties assigned:", res.stats.totalDutiesAssigned);
  console.log("Back-to-back M&A duties:", res.stats.backToBackCount);
  console.log("Subject conflicts avoided:", res.stats.subjectConflictsAvoided);
  console.log("Unfilled positions:", res.unfilledPositions.length);

  // Verify st1 (OSY teacher) is NOT Junior Supervisor on 2026-11-17 MORNING
  const osyConflict = res.duties.find(
    (d) => d.date === "2026-11-17" && d.slot === "MORNING" && d.staffId === "st1" && d.role === "JUNIOR_SUPERVISOR"
  );
  if (osyConflict) {
    throw new Error("FAIL: OSY Teacher was assigned Junior Supervisor during OSY exam!");
  }

  // Verify st2 (PIC teacher) is NOT Junior Supervisor on 2026-11-17 AFTERNOON
  const picConflict = res.duties.find(
    (d) => d.date === "2026-11-17" && d.slot === "AFTERNOON" && d.staffId === "st2" && d.role === "JUNIOR_SUPERVISOR"
  );
  if (picConflict) {
    throw new Error("FAIL: PIC Teacher was assigned Junior Supervisor during PIC exam!");
  }

  // Verify no back-to-back duties when 8 teaching staff are available
  if (res.stats.backToBackCount !== 0) {
    throw new Error(`Expected 0 back-to-back duties, got ${res.stats.backToBackCount}`);
  }

  console.log("✓ All Duty Allocator Unit Tests Passed!");
}

runTests();
