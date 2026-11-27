import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const instId = session.instituteId;
    const swaps = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      return tx.dutySwapRequest.findMany({
        where: { instituteId: instId },
        include: {
          duty: { include: { block: { include: { room: true } } } },
          requester: true,
          target: true,
        },
        orderBy: { id: "desc" },
      });
    });

    return NextResponse.json({ swaps });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dutyId, targetStaffId, reason } = await req.json();
    if (!dutyId || !targetStaffId || !reason) {
      return NextResponse.json({ error: "dutyId, targetStaffId, and reason are required" }, { status: 400 });
    }

    const instId = session.instituteId;

    const created = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const duty = await tx.supervisionDuty.findFirst({
        where: { id: dutyId, instituteId: instId },
      });
      if (!duty) throw new Error("Duty not found");
      if (duty.staffId === targetStaffId) {
        throw new Error("Target staff cannot be the same as current supervisor");
      }

      return tx.dutySwapRequest.create({
        data: {
          instituteId: instId,
          dutyId,
          requesterStaffId: duty.staffId,
          targetStaffId,
          reason,
          status: "PENDING",
        },
      });
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: "DUTY_SWAP_REQUESTED",
      entity: "DutySwapRequest",
      entityId: created.id,
      reason,
      afterData: { dutyId, targetStaffId },
    });

    return NextResponse.json({ success: true, swap: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create swap request" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { swapId, action } = await req.json(); // APPROVE | REJECT
    if (!swapId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "swapId and valid action (APPROVE/REJECT) required" }, { status: 400 });
    }

    const instId = session.instituteId;

    const result = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const swap = await tx.dutySwapRequest.findFirst({
        where: { id: swapId, instituteId: instId },
        include: { duty: true },
      });
      if (!swap) throw new Error("Swap request not found");
      if (swap.status !== "PENDING") throw new Error("Swap request already reviewed");

      if (action === "APPROVE") {
        // Check if targetStaffId already has a duty in the same day+slot; if so, swap them!
        const targetDuty = await tx.supervisionDuty.findFirst({
          where: {
            sessionId: swap.duty.sessionId,
            examDay: swap.duty.examDay,
            slot: swap.duty.slot,
            staffId: swap.targetStaffId,
          },
        });

        if (targetDuty) {
          // Two-way swap via temporary placeholder or delete+update?
          // Unique constraint is (sessionId, examDay, slot, staffId).
          // Delete targetDuty temporarily or update in sequence? Since we can't violate unique mid-statement:
          await tx.supervisionDuty.delete({ where: { id: targetDuty.id } });
          await tx.supervisionDuty.update({
            where: { id: swap.dutyId },
            data: {
              staffId: swap.targetStaffId,
              isOverride: true,
              version: swap.duty.version + 1,
            },
          });
          await tx.supervisionDuty.create({
            data: {
              instituteId: instId,
              sessionId: targetDuty.sessionId,
              examDay: targetDuty.examDay,
              examDate: targetDuty.examDate,
              slot: targetDuty.slot,
              blockId: targetDuty.blockId,
              staffId: swap.requesterStaffId,
              role: targetDuty.role,
              isOverride: true,
              version: targetDuty.version + 1,
            },
          });
        } else {
          await tx.supervisionDuty.update({
            where: { id: swap.dutyId },
            data: {
              staffId: swap.targetStaffId,
              isOverride: true,
              version: swap.duty.version + 1,
            },
          });
        }
      }

      return tx.dutySwapRequest.update({
        where: { id: swapId },
        data: {
          status: action === "APPROVE" ? "APPROVED" : "REJECTED",
          reviewedAt: new Date(),
        },
      });
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: action === "APPROVE" ? "DUTY_SWAP_APPROVED" : "DUTY_SWAP_REJECTED",
      entity: "DutySwapRequest",
      entityId: swapId,
      afterData: { action },
    });

    return NextResponse.json({ success: true, swap: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to review swap" }, { status: 400 });
  }
}
