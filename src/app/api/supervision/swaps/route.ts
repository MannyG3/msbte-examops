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

    const { dutyId, targetStaffId, reason } = await req.json();

    if (!dutyId || !targetStaffId || !reason) {
      return NextResponse.json({ error: "Duty, target staff, and reason are required" }, { status: 400 });
    }

    const duty = await prisma.supervisionDuty.findUnique({
      where: { id: dutyId },
      include: { staff: true },
    });

    if (!duty) {
      return NextResponse.json({ error: "Duty not found" }, { status: 404 });
    }

    const swapRequest = await prisma.dutySwapRequest.create({
      data: {
        dutyId,
        requesterStaffId: duty.staffId,
        targetStaffId,
        reason,
        status: "PENDING",
      },
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "DUTY_SWAP_REQUESTED",
      entity: "DutySwapRequest",
      entityId: swapRequest.id,
      afterData: { dutyId, from: duty.staff.name, targetStaffId, reason },
    });

    return NextResponse.json({ success: true, swapRequest });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to request swap" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { swapId, action, coordinatorRemarks } = await req.json();
    if (!swapId || !["APPROVED", "REJECTED"].includes(action)) {
      return NextResponse.json({ error: "Invalid swap action" }, { status: 400 });
    }

    const swap = await prisma.dutySwapRequest.findUnique({
      where: { id: swapId },
      include: {
        duty: true,
        requester: true,
        target: true,
      },
    });

    if (!swap) {
      return NextResponse.json({ error: "Swap request not found" }, { status: 404 });
    }

    if (action === "APPROVED") {
      await prisma.$transaction([
        prisma.supervisionDuty.update({
          where: { id: swap.dutyId },
          data: {
            staffId: swap.targetStaffId,
            version: { increment: 1 },
          },
        }),
        prisma.dutySwapRequest.update({
          where: { id: swapId },
          data: {
            status: "APPROVED",
            coordinatorRemarks: coordinatorRemarks || "Approved by Exam Coordinator",
            reviewedAt: new Date(),
          },
        }),
      ]);
    } else {
      await prisma.dutySwapRequest.update({
        where: { id: swapId },
        data: {
          status: "REJECTED",
          coordinatorRemarks: coordinatorRemarks || "Rejected",
          reviewedAt: new Date(),
        },
      });
    }

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: `DUTY_SWAP_${action}`,
      entity: "DutySwapRequest",
      entityId: swapId,
      beforeData: { staffId: swap.requesterStaffId, name: swap.requester.name },
      afterData: { staffId: swap.targetStaffId, name: swap.target.name, status: action },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update swap request" }, { status: 500 });
  }
}
