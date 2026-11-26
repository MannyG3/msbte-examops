import { generateSeatingPlan, SeatingPaperInput, SeatingRoomInput } from "./seating-generator";

function runTests() {
  console.log("=== Testing MSBTE Seating Allocation Engine ===");

  // Test 1: Alternating paper mixing on 2-seater benches
  const paperA: SeatingPaperInput = {
    paperId: "p1",
    paperCode: "315319",
    paperName: "Operating Systems",
    schemeString: "CO-5-K",
    students: Array.from({ length: 30 }, (_, i) => ({
      studentId: `sA_${i + 1}`,
      name: `Student A${i + 1}`,
      enrollmentNo: `24001850${String(i + 1).padStart(2, "0")}`,
      seatNo: `5010${String(i + 1).padStart(2, "0")}`,
      rollNo: `26CO5${String(i + 1).padStart(2, "0")}`,
      programmeCode: "CO",
    })),
  };

  const paperB: SeatingPaperInput = {
    paperId: "p2",
    paperCode: "313301",
    paperName: "Programming in C",
    schemeString: "CO-3-K",
    students: Array.from({ length: 30 }, (_, i) => ({
      studentId: `sB_${i + 1}`,
      name: `Student B${i + 1}`,
      enrollmentNo: `24001830${String(i + 1).padStart(2, "0")}`,
      seatNo: `3010${String(i + 1).padStart(2, "0")}`,
      rollNo: `26CO3${String(i + 1).padStart(2, "0")}`,
      programmeCode: "CO",
    })),
  };

  const rooms: SeatingRoomInput[] = [
    { roomId: "r101", roomName: "Room 101", benchCount: 15, seatsPerBench: 2 },
    { roomId: "r102", roomName: "Room 102", benchCount: 15, seatsPerBench: 2 },
  ];

  const result = generateSeatingPlan([paperA, paperB], rooms, { alternateOnBench: true });

  console.log("Total students to seat:", 60);
  console.log("Total allocated:", result.stats.totalAllocated);
  console.log("Rooms used:", result.stats.totalRoomsUsed);
  console.log("Bench adjacent clashes:", result.stats.adjacentPaperClashes);
  console.log("Unallocated count:", result.unallocatedStudents.length);

  // Assertion 1: All 60 students must be allocated
  if (result.stats.totalAllocated !== 60) {
    throw new Error(`Expected 60 allocated, got ${result.stats.totalAllocated}`);
  }

  // Assertion 2: Zero adjacent paper clashes on benches
  if (result.stats.adjacentPaperClashes !== 0) {
    throw new Error(`Expected 0 bench clashes, got ${result.stats.adjacentPaperClashes}`);
  }

  // Assertion 3: Check sequential seat number ordering in Room 101 for Paper A
  const r101PaperA = result.allocations
    .filter((a) => a.roomId === "r101" && a.paperId === "p1")
    .map((a) => a.seatNo);

  const isSorted = r101PaperA.every((val, i, arr) => !i || arr[i - 1].localeCompare(val) <= 0);
  console.log("Paper A seat numbers sequential in Room 101:", isSorted ? "PASSED" : "FAILED");
  if (!isSorted) {
    throw new Error("Students not sorted sequentially by seat number!");
  }

  console.log("Sample bench distribution in Room 101:");
  for (let b = 1; b <= 3; b++) {
    const left = result.allocations.find((a) => a.roomId === "r101" && a.benchNo === b && a.seatPosition === 1);
    const right = result.allocations.find((a) => a.roomId === "r101" && a.benchNo === b && a.seatPosition === 2);
    console.log(
      `  Bench ${b}: Left = [${left?.paperCode} Seat:${left?.seatNo}] | Right = [${right?.paperCode} Seat:${right?.seatNo}]`
    );
  }

  console.log("\n✓ All Scheduler Unit Tests Passed Successfully!\n");
}

runTests();
