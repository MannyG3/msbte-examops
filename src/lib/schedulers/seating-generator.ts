export interface SeatingStudent {
  studentId: string;
  name: string;
  enrollmentNo: string;
  seatNo: string;
  rollNo: string;
  programmeCode: string;
}

export interface SeatingPaperInput {
  paperId: string;
  paperCode: string;
  paperName: string;
  schemeString: string;
  students: SeatingStudent[];
}

export interface SeatingRoomInput {
  roomId: string;
  roomName: string;
  benchCount: number;
  seatsPerBench: number; // usually 2, or 1
  isLocked?: boolean;
}

export interface SeatingAllocationOutput {
  paperId: string;
  studentId: string;
  roomId: string;
  benchNo: number; // 1-indexed: Bench 1, 2, ...
  seatPosition: number; // 1-indexed: 1 (Left), 2 (Right)
  seatNo: string;
  studentName: string;
  paperCode: string;
}

export interface RoomPaperCountSummary {
  paperId: string;
  paperCode: string;
  paperName: string;
  count: number;
  startSeatNo: string;
  endSeatNo: string;
}

export interface RoomSeatingSummary {
  roomId: string;
  roomName: string;
  benchCount: number;
  seatsPerBench: number;
  capacity: number;
  totalSeated: number;
  paperSummaries: RoomPaperCountSummary[];
}

export interface SeatingGeneratorResult {
  allocations: SeatingAllocationOutput[];
  roomSummaries: RoomSeatingSummary[];
  unallocatedStudents: { paperId: string; studentId: string; seatNo: string }[];
  stats: {
    totalStudents: number;
    totalAllocated: number;
    totalRoomsUsed: number;
    adjacentPaperClashes: number;
  };
}

/**
 * Pure TypeScript Greedy + Constraint Alternating Bench Seating Generator
 */
export function generateSeatingPlan(
  papers: SeatingPaperInput[],
  rooms: SeatingRoomInput[],
  options: {
    sortBy?: "seatNo" | "rollNo" | "enrollmentNo";
    alternateOnBench?: boolean;
  } = {}
): SeatingGeneratorResult {
  const sortBy = options.sortBy || "seatNo";
  const alternateOnBench = options.alternateOnBench !== false;

  // 1. Sort students within each paper sequentially by seatNo or rollNo
  const paperQueues: {
    paperId: string;
    paperCode: string;
    paperName: string;
    students: SeatingStudent[];
  }[] = papers.map((p) => {
    const sortedStudents = [...p.students].sort((a, b) => {
      const valA = (a[sortBy] || a.enrollmentNo || "").toString();
      const valB = (b[sortBy] || b.enrollmentNo || "").toString();
      return valA.localeCompare(valB, undefined, { numeric: true });
    });

    return {
      paperId: p.paperId,
      paperCode: p.paperCode,
      paperName: p.paperName,
      students: sortedStudents,
    };
  });

  const totalStudents = paperQueues.reduce((sum, p) => sum + p.students.length, 0);

  const allocations: SeatingAllocationOutput[] = [];
  const unallocatedStudents: { paperId: string; studentId: string; seatNo: string }[] = [];
  const roomSummaries: RoomSeatingSummary[] = [];

  let adjacentPaperClashes = 0;
  let activePaperIndexA = 0;
  let activePaperIndexB = paperQueues.length > 1 ? 1 : 0;

  // Function to pull next student from a paper queue
  function getNextStudent(preferredIndex: number, avoidPaperId?: string): {
    student: SeatingStudent;
    paperId: string;
    paperCode: string;
    paperName: string;
  } | null {
    // Try preferred index first
    if (paperQueues[preferredIndex]?.students.length > 0) {
      const q = paperQueues[preferredIndex];
      if (!avoidPaperId || q.paperId !== avoidPaperId || paperQueues.every((p) => p.students.length === 0 || p.paperId === avoidPaperId)) {
        const student = q.students.shift()!;
        return { student, paperId: q.paperId, paperCode: q.paperCode, paperName: q.paperName };
      }
    }

    // Otherwise, search for any queue that doesn't match avoidPaperId
    for (let i = 0; i < paperQueues.length; i++) {
      if (paperQueues[i].students.length > 0 && (!avoidPaperId || paperQueues[i].paperId !== avoidPaperId)) {
        const student = paperQueues[i].students.shift()!;
        return { student, paperId: paperQueues[i].paperId, paperCode: paperQueues[i].paperCode, paperName: paperQueues[i].paperName };
      }
    }

    // If only avoidPaperId is left, take from it (clash inevitable)
    for (let i = 0; i < paperQueues.length; i++) {
      if (paperQueues[i].students.length > 0) {
        const student = paperQueues[i].students.shift()!;
        return { student, paperId: paperQueues[i].paperId, paperCode: paperQueues[i].paperCode, paperName: paperQueues[i].paperName };
      }
    }

    return null;
  }

  // 2. Iterate through rooms and fill benches
  for (const room of rooms) {
    if (room.isLocked) continue;

    // Check if any students remain across all queues
    const hasRemainingStudents = paperQueues.some((q) => q.students.length > 0);
    if (!hasRemainingStudents) break;

    const roomAllocations: SeatingAllocationOutput[] = [];
    const seatsPerBench = Math.max(1, room.seatsPerBench || 2);

    for (let bench = 1; bench <= room.benchCount; bench++) {
      let previousSeatPaperId: string | undefined = undefined;

      for (let pos = 1; pos <= seatsPerBench; pos++) {
        const hasStudents = paperQueues.some((q) => q.students.length > 0);
        if (!hasStudents) break;

        // In 2-seater benches:
        // Position 1: prefer stream A
        // Position 2: prefer stream B (avoiding stream A if alternateOnBench is true)
        const preferredIdx = pos === 1 ? (bench % 2 === 1 ? 0 : (paperQueues.length > 1 ? 1 : 0)) : (bench % 2 === 1 ? (paperQueues.length > 1 ? 1 : 0) : 0);
        const avoidId = (alternateOnBench && pos > 1) ? previousSeatPaperId : undefined;

        const next = getNextStudent(preferredIdx, avoidId);
        if (!next) break;

        if (previousSeatPaperId && previousSeatPaperId === next.paperId) {
          adjacentPaperClashes++;
        }

        previousSeatPaperId = next.paperId;

        const alloc: SeatingAllocationOutput = {
          paperId: next.paperId,
          studentId: next.student.studentId,
          roomId: room.roomId,
          benchNo: bench,
          seatPosition: pos,
          seatNo: next.student.seatNo,
          studentName: next.student.name,
          paperCode: next.paperCode,
        };

        roomAllocations.push(alloc);
        allocations.push(alloc);
      }
    }

    // Build room summary
    const paperMap = new Map<string, { code: string; name: string; seats: string[] }>();
    roomAllocations.forEach((a) => {
      if (!paperMap.has(a.paperId)) {
        paperMap.set(a.paperId, {
          code: a.paperCode,
          name: papers.find((p) => p.paperId === a.paperId)?.paperName || "",
          seats: [],
        });
      }
      paperMap.get(a.paperId)!.seats.push(a.seatNo);
    });

    const paperSummaries: RoomPaperCountSummary[] = [];
    paperMap.forEach((val, pId) => {
      const sortedSeats = val.seats.filter(Boolean).sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
      paperSummaries.push({
        paperId: pId,
        paperCode: val.code,
        paperName: val.name,
        count: val.seats.length,
        startSeatNo: sortedSeats[0] || "—",
        endSeatNo: sortedSeats[sortedSeats.length - 1] || "—",
      });
    });

    roomSummaries.push({
      roomId: room.roomId,
      roomName: room.roomName,
      benchCount: room.benchCount,
      seatsPerBench: room.seatsPerBench,
      capacity: room.benchCount * room.seatsPerBench,
      totalSeated: roomAllocations.length,
      paperSummaries,
    });
  }

  // Record unallocated students
  paperQueues.forEach((q) => {
    q.students.forEach((s) => {
      unallocatedStudents.push({
        paperId: q.paperId,
        studentId: s.studentId,
        seatNo: s.seatNo,
      });
    });
  });

  return {
    allocations,
    roomSummaries,
    unallocatedStudents,
    stats: {
      totalStudents,
      totalAllocated: allocations.length,
      totalRoomsUsed: roomSummaries.length,
      adjacentPaperClashes,
    },
  };
}
