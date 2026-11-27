import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { blockNo, roomNo, building = "Main Building", floor = 1, columns = 4, columnBreak = 9, numberingStyle = "SERPENTINE" } =
      await req.json();

    if (!blockNo || !roomNo) {
      return NextResponse.json({ error: "Block No and Room No are required" }, { status: 400 });
    }

    const instId = session.instituteId;
    const strength = Number(columns) * Number(columnBreak);

    const block = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const room = await tx.room.upsert({
        where: { instituteId_roomNo: { instituteId: instId, roomNo: roomNo.trim() } },
        update: { building, floor: Number(floor) },
        create: { instituteId: instId, roomNo: roomNo.trim(), building, floor: Number(floor) },
      });

      return tx.block.upsert({
        where: { instituteId_blockNo: { instituteId: instId, blockNo: Number(blockNo) } },
        update: {
          roomId: room.id,
          columns: Number(columns),
          columnBreak: Number(columnBreak),
          strength,
          numberingStyle: numberingStyle === "STRAIGHT" ? "STRAIGHT" : "SERPENTINE",
        },
        create: {
          instituteId: instId,
          blockNo: Number(blockNo),
          roomId: room.id,
          columns: Number(columns),
          columnBreak: Number(columnBreak),
          strength,
          numberingStyle: numberingStyle === "STRAIGHT" ? "STRAIGHT" : "SERPENTINE",
        },
        include: { room: true },
      });
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: "UPSERT_BLOCK",
      entity: "Block",
      entityId: block.id,
      afterData: { blockNo, roomNo, strength, numberingStyle },
    });

    return NextResponse.json({ success: true, block });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save block" }, { status: 500 });
  }
}
