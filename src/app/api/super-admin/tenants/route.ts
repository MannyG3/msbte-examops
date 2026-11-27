import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const { instituteId, action, planId, validUntil } = await req.json();
    if (!instituteId || !action) {
      return NextResponse.json({ error: "instituteId and action required" }, { status: 400 });
    }

    const data: any = {};
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in1Year = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    if (action === "APPROVE_TRIAL") {
      data.status = "TRIAL";
      data.trialEndsAt = in30Days;
      data.validUntil = in30Days;
    } else if (action === "ACTIVATE") {
      data.status = "ACTIVE";
      data.validUntil = validUntil ? new Date(validUntil) : in1Year;
    } else if (action === "SUSPEND") {
      data.status = "SUSPENDED";
    } else if (action === "UPDATE_PLAN") {
      if (planId) data.planId = planId;
      if (validUntil) data.validUntil = new Date(validUntil);
    }

    const updated = await prisma.institute.update({
      where: { id: instituteId },
      data,
    });

    await logAuditAction({
      instituteId,
      userId: session.userId,
      action: `SUPER_ADMIN_${action}`,
      entity: "Institute",
      entityId: instituteId,
      afterData: data,
    });

    return NextResponse.json({ success: true, institute: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 });
  }
}
