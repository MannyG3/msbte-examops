import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allocationIdA, allocationIdB } = await req.json();

    if (!allocationIdA || !allocationIdB) {
      return NextResponse.json({ error: "Two allocation IDs required to swap" }, { status: 400 });
    }

    const [allocA, allocB] = await Promise.all([
      prisma.seatingAllocation.findUnique({ where: { id: allocationIdA }, include: { student: true } }),
      prisma.seatingAllocation.findUnique({ where: { id: allocationIdB }, include: { student: true } }),
    ]);

    if (!allocA || !allocB) {
      return NextResponse.json({ error: "Allocations not found" }, { status: 404 });
    }

    // Swap student placements
    await prisma.$transaction([
      prisma.seatingAllocation.update({
        where: { id: allocA.id },
        data: {
          studentId: allocB.studentId,
          version: { increment: 1 },
        },
      }),
      prisma.seatingAllocation.update({
        where: { id: allocB.id },
        data: {
          studentId: allocA.studentId,
          version: { increment: 1 },
        },
      }),
    ]);

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "SWAP_SEATING_ALLOCATION",
      entity: "SeatingAllocation",
      afterData: {
        swapped: [
          { student: allocA.student.name, fromBench: allocA.benchNo, toBench: allocB.benchNo },
          { student: allocB.student.name, fromBench: allocB.benchNo, toBench: allocA.benchNo },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to swap seats" }, { status: 500 });
  }
}
