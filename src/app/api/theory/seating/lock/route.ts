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

    const { roomId, isLocked } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }

    const room = await prisma.room.update({
      where: { id: roomId },
      data: { isLocked: Boolean(isLocked) },
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: isLocked ? "LOCK_ROOM_SEATING" : "UNLOCK_ROOM_SEATING",
      entity: "Room",
      entityId: roomId,
      afterData: { isLocked: room.isLocked },
    });

    return NextResponse.json({ success: true, isLocked: room.isLocked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update room lock" }, { status: 500 });
  }
}
