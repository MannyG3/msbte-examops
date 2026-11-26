import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId, isCompleted } = await req.json();
    if (!itemId) {
      return NextResponse.json({ error: "Checklist item ID required" }, { status: 400 });
    }

    const updated = await prisma.sessionPhaseChecklist.update({
      where: { id: itemId },
      data: {
        isCompleted: Boolean(isCompleted),
        completedAt: isCompleted ? new Date() : null,
      },
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: isCompleted ? "CHECKLIST_ITEM_COMPLETED" : "CHECKLIST_ITEM_REOPENED",
      entity: "SessionPhaseChecklist",
      entityId: itemId,
      afterData: { title: updated.title, isCompleted: updated.isCompleted },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update checklist" }, { status: 500 });
  }
}
