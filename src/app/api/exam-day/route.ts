import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

async function ensureSpecialCode(tx: any, instituteId: string, code: string, label: string) {
  const existing = await tx.specialCode.findFirst({
    where: { instituteId, code },
  });
  if (existing) return existing;
  return tx.specialCode.create({
    data: { instituteId, code, label },
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, reason } = body;
    const instId = session.instituteId;

    const result = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const activeSession = await tx.examSession.findFirst({
        where: { instituteId: instId },
        orderBy: { createdAt: "desc" },
      });
      if (!activeSession) throw new Error("No active session found");

      if (
        activeSession.status === "LOCKED" &&
        action !== "UNLOCK_SESSION" &&
        action !== "LOCK_SESSION" &&
        !reason
      ) {
        throw new Error("Session is LOCKED. Provide a reason to edit exam-day records.");
      }

      if (action === "TOGGLE_ABSENT") {
        const { candidatePaperId, section = 1 } = body;
        const abCode = await ensureSpecialCode(tx, instId, "AB", "Absent");
        const existing = await tx.candidateStatus.findFirst({
          where: { candidatePaperId, section: Number(section) },
          include: { specialCode: true },
        });

        if (existing && existing.specialCode.code === "AB") {
          await tx.candidateStatus.delete({ where: { id: existing.id } });
          return { status: "PRESENT" };
        } else if (existing) {
          await tx.candidateStatus.update({
            where: { id: existing.id },
            data: { specialCodeId: abCode.id, markedById: session.userId, markedAt: new Date() },
          });
          return { status: "AB" };
        } else {
          await tx.candidateStatus.create({
            data: {
              instituteId: instId,
              candidatePaperId,
              specialCodeId: abCode.id,
              section: Number(section),
              markedById: session.userId,
            },
          });
          return { status: "AB" };
        }
      }

      if (action === "SAVE_SERIALS") {
        const { candidatePaperId, section = 1, mainBookSerial, supplementSerials } = body;
        const presentCode = await ensureSpecialCode(tx, instId, "PR", "Present");
        const existing = await tx.candidateStatus.findFirst({
          where: { candidatePaperId, section: Number(section) },
        });
        if (existing) {
          await tx.candidateStatus.update({
            where: { id: existing.id },
            data: { mainBookSerial, supplementSerials, markedById: session.userId },
          });
        } else {
          await tx.candidateStatus.create({
            data: {
              instituteId: instId,
              candidatePaperId,
              specialCodeId: presentCode.id,
              section: Number(section),
              mainBookSerial,
              supplementSerials,
              markedById: session.userId,
            },
          });
        }
        return { saved: true };
      }

      if (action === "SUBMIT_BLOCK") {
        const { examDay, slot, blockId, isSubmitted = true } = body;
        const sub = await tx.blockSubmission.upsert({
          where: {
            sessionId_examDay_slot_blockId: {
              sessionId: activeSession.id,
              examDay: Number(examDay),
              slot,
              blockId,
            },
          },
          update: {
            isSubmitted: Boolean(isSubmitted),
            submittedById: session.userId,
            submittedAt: isSubmitted ? new Date() : null,
          },
          create: {
            instituteId: instId,
            sessionId: activeSession.id,
            examDay: Number(examDay),
            slot,
            blockId,
            isSubmitted: Boolean(isSubmitted),
            submittedById: session.userId,
            submittedAt: isSubmitted ? new Date() : null,
          },
        });
        return { submission: sub };
      }

      if (action === "COPY_CASE") {
        const { candidatePaperId, reportedTime, materialSeized, supervisorStatement, oicSignedBy } = body;
        if (!candidatePaperId || !reportedTime || !materialSeized || !supervisorStatement) {
          throw new Error("All Copy Case fields are required");
        }
        const ccCode = await ensureSpecialCode(tx, instId, "CC", "Copy Case");
        const cc = await tx.copyCase.create({
          data: {
            instituteId: instId,
            candidatePaperId,
            reportedTime,
            materialSeized,
            supervisorStatement,
            oicSignedBy: oicSignedBy || null,
          },
        });
        await tx.candidateStatus.upsert({
          where: { candidatePaperId_section: { candidatePaperId, section: 1 } },
          update: { specialCodeId: ccCode.id, markedById: session.userId, markedAt: new Date() },
          create: {
            instituteId: instId,
            candidatePaperId,
            specialCodeId: ccCode.id,
            section: 1,
            markedById: session.userId,
          },
        });
        return { copyCase: cc };
      }

      if (action === "EARLY_LEAVING") {
        const { examDay, slot, seatNo, csm, timeOut, supervisorId } = body;
        if (!seatNo || !csm || !timeOut) {
          throw new Error("Seat No, C-S-M, and Time Out are required");
        }
        const el = await tx.earlyLeaving.create({
          data: {
            instituteId: instId,
            sessionId: activeSession.id,
            examDay: Number(examDay),
            slot,
            seatNo,
            csm,
            timeOut,
            supervisorId: supervisorId || null,
          },
        });
        return { earlyLeaving: el };
      }

      if (action === "SAVE_ANSWER_BOOK_RECORD") {
        const {
          examDay,
          slot,
          blockId,
          mainProvided = 0,
          mainUsed = 0,
          suppProvided = 0,
          suppUsed = 0,
          drawingProvided = 0,
          drawingUsed = 0,
          graphProvided = 0,
          graphUsed = 0,
          controllerSignedBy,
          supervisorSignedBy,
        } = body;
        const rec = await tx.answerBookRecord.upsert({
          where: {
            sessionId_examDay_slot_blockId: {
              sessionId: activeSession.id,
              examDay: Number(examDay),
              slot,
              blockId,
            },
          },
          update: {
            mainProvided: Number(mainProvided),
            mainUsed: Number(mainUsed),
            suppProvided: Number(suppProvided),
            suppUsed: Number(suppUsed),
            drawingProvided: Number(drawingProvided),
            drawingUsed: Number(drawingUsed),
            graphProvided: Number(graphProvided),
            graphUsed: Number(graphUsed),
            controllerSignedBy,
            supervisorSignedBy,
          },
          create: {
            instituteId: instId,
            sessionId: activeSession.id,
            examDay: Number(examDay),
            slot,
            blockId,
            mainProvided: Number(mainProvided),
            mainUsed: Number(mainUsed),
            suppProvided: Number(suppProvided),
            suppUsed: Number(suppUsed),
            drawingProvided: Number(drawingProvided),
            drawingUsed: Number(drawingUsed),
            graphProvided: Number(graphProvided),
            graphUsed: Number(graphUsed),
            controllerSignedBy,
            supervisorSignedBy,
          },
        });
        return { record: rec };
      }

      if (action === "SAVE_QP_RECORD") {
        const { timetableEntryId, receivedCount, usedCount, returnedCount, extraCount, lessCount } = body;
        const existing = await tx.qPInventory.findUnique({ where: { timetableEntryId } });
        if (existing) {
          const updated = await tx.qPInventory.update({
            where: { timetableEntryId },
            data: {
              receivedCount: receivedCount !== undefined ? Number(receivedCount) : null,
              usedCount: usedCount !== undefined ? Number(usedCount) : null,
              returnedCount: returnedCount !== undefined ? Number(returnedCount) : null,
              extraCount: extraCount !== undefined ? Number(extraCount) : null,
              lessCount: lessCount !== undefined ? Number(lessCount) : null,
            },
          });
          return { qp: updated };
        } else {
          const created = await tx.qPInventory.create({
            data: {
              instituteId: instId,
              timetableEntryId,
              dcCode: "DC-01",
              ecCode: "EC-01",
              qpCount: Number(receivedCount || 0),
              receivedCount: Number(receivedCount || 0),
              usedCount: Number(usedCount || 0),
              returnedCount: Number(returnedCount || 0),
              extraCount: Number(extraCount || 0),
              lessCount: Number(lessCount || 0),
            },
          });
          return { qp: created };
        }
      }

      if (action === "LOCK_SESSION" || action === "UNLOCK_SESSION") {
        const lock = action === "LOCK_SESSION";
        const updated = await tx.examSession.update({
          where: { id: activeSession.id },
          data: {
            status: lock ? "LOCKED" : "ACTIVE",
            lockedAt: lock ? new Date() : null,
            lockedById: lock ? session.userId : null,
          },
        });
        return { sessionStatus: updated.status };
      }

      throw new Error(`Unknown action: ${action}`);
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: `EXAM_DAY_${action}`,
      entity: "ExamDay",
      reason: reason || null,
      afterData: body,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Exam-day action failed" }, { status: 400 });
  }
}
