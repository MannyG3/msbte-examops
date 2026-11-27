import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertTenantWritable } from "@/lib/plan-guard";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { action } = body;
    const instId = session.instituteId;

    const result = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      await assertTenantWritable(tx, instId);

      if (action === "ADD_EXAMINER") {
        const { name, designation, instituteName, phone, email, subjectCode, type = "EXTERNAL" } = body;
        if (!name || !subjectCode) throw new Error("Examiner name and subjectCode are required");
        const ex = await tx.examiner.create({
          data: {
            instituteId: instId,
            name,
            designation: designation || "Lecturer",
            instituteName: instituteName || "External Polytechnic",
            phone: phone || null,
            email: email || null,
            subjectCode,
            type,
          },
        });
        return { examiner: ex };
      }

      if (action === "ADD_SLOT") {
        const { csm, subjectCode, batchName, labName, examDate, timeSlot, internalExaminerId, externalExaminerId } = body;
        if (!csm || !subjectCode || !batchName || !labName || !examDate || !timeSlot) {
          throw new Error("All practical slot fields are required");
        }
        const activeSession = await tx.examSession.findFirst({
          where: { instituteId: instId },
          orderBy: { createdAt: "desc" },
        });
        if (!activeSession) throw new Error("No active session found");

        const dateObj = new Date(`${examDate}T00:00:00.000Z`);

        // Clash detection on same date + timeSlot
        const existingSlots = await tx.practicalSlot.findMany({
          where: { sessionId: activeSession.id, examDate: dateObj, timeSlot },
        });

        for (const s of existingSlots) {
          if (s.batchName === batchName) throw new Error(`Clash: Batch ${batchName} already scheduled in ${timeSlot}`);
          if (s.labName === labName) throw new Error(`Clash: Lab ${labName} already occupied in ${timeSlot}`);
          if (internalExaminerId && s.internalExaminerId === internalExaminerId) {
            throw new Error(`Clash: Internal examiner already assigned in ${timeSlot}`);
          }
          if (externalExaminerId && s.externalExaminerId === externalExaminerId) {
            throw new Error(`Clash: External examiner already assigned in ${timeSlot}`);
          }
        }

        const slot = await tx.practicalSlot.create({
          data: {
            instituteId: instId,
            sessionId: activeSession.id,
            csm,
            subjectCode,
            batchName,
            labName,
            examDate: dateObj,
            timeSlot,
            internalExaminerId: internalExaminerId || null,
            externalExaminerId: externalExaminerId || null,
          },
        });
        return { slot };
      }

      if (action === "DELETE_SLOT") {
        await tx.practicalSlot.delete({ where: { id: body.slotId } });
        return { deleted: true };
      }

      throw new Error(`Unknown action: ${action}`);
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Practical action failed" }, { status: 400 });
  }
}
