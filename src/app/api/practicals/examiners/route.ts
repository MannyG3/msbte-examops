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

    const { name, collegeName, phone, email, subjects } = await req.json();

    if (!name || !collegeName || !phone || !email) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const examiner = await prisma.externalExaminer.create({
      data: {
        instituteId: session.instituteId,
        name,
        collegeName,
        phone,
        email,
        subjects: subjects || "",
      },
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "ADD_EXTERNAL_EXAMINER",
      entity: "ExternalExaminer",
      entityId: examiner.id,
      afterData: { name, collegeName, subjects },
    });

    return NextResponse.json({ success: true, examiner });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create examiner" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slotId, externalExaminerId } = await req.json();
    if (!slotId) {
      return NextResponse.json({ error: "Slot ID required" }, { status: 400 });
    }

    const updated = await prisma.practicalSlot.update({
      where: { id: slotId },
      data: { externalExaminerId: externalExaminerId || null },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to assign examiner" }, { status: 500 });
  }
}
