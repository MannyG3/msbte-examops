import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  allocateSupervisors,
  StaffInput,
  SupervisionSlotInput,
  ExistingDutyInput,
} from "@/lib/allocators/supervisor-allocator";
import { logAuditAction } from "@/lib/audit";
import { assertTenantWritable } from "@/lib/plan-guard";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      mode = "DAY_SLOT", // "DAY_SLOT" | "SESSION"
      examDay,
      slot,
      relieversPerNBlocks = 4,
      seniorCount = 1,
      avoidOwnSubject = true,
      avoidBackToBack = true,
    } = body;

    if (mode === "DAY_SLOT" && (!examDay || !slot)) {
      return NextResponse.json({ error: "examDay and slot are required for DAY_SLOT mode" }, { status: 400 });
    }

    const instId = session.instituteId;

    const outcome = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      await assertTenantWritable(tx, instId);
      const activeSession = await tx.examSession.findFirst({
        where: { instituteId: instId },
        orderBy: { createdAt: "desc" },
      });
      if (!activeSession) throw new Error("No active exam session found");

      const [staffRows, blockRows, timetableRows, allocRows, existingDutyRows] = await Promise.all([
        tx.staff.findMany({
          where: { instituteId: instId },
          orderBy: { name: "asc" },
        }),
        tx.block.findMany({
          where: { instituteId: instId },
          include: { room: true },
          orderBy: { blockNo: "asc" },
        }),
        tx.timetableEntry.findMany({
          where: {
            sessionId: activeSession.id,
            ...(mode === "DAY_SLOT" ? { examDay: Number(examDay), slot } : {}),
          },
          include: {
            subject: true,
            _count: { select: { papers: true } },
          },
          orderBy: [{ examDay: "asc" }, { slot: "asc" }],
        }),
        tx.blockAllocation.findMany({
          where: {
            sessionId: activeSession.id,
            ...(mode === "DAY_SLOT" ? { examDay: Number(examDay), slot } : {}),
          },
          include: {
            block: { include: { room: true } },
            candidatePaper: {
              include: {
                timetableEntry: { include: { subject: true } },
              },
            },
          },
        }),
        tx.supervisionDuty.findMany({
          where: { sessionId: activeSession.id },
        }),
      ]);

      if (staffRows.length === 0) throw new Error("No staff configured in Masters");
      if (blockRows.length === 0) throw new Error("No blocks configured in Masters");
      if (timetableRows.length === 0) throw new Error("No timetable entries found");

      const staffInputs: StaffInput[] = staffRows.map((s) => ({
        id: s.id,
        name: s.name,
        designation: s.designation,
        department: s.department,
        type: s.type,
        subjectsTaught: s.subjectsTaught,
        maxDutiesPerSession: s.maxDutiesPerSession,
        unavailableDates: s.unavailableDates,
      }));

      // Group timetable entries by day+slot
      const slotMap = new Map<
        string,
        {
          examDay: number;
          examDate: string;
          slot: "MORNING" | "AFTERNOON";
          subjectCodes: Set<string>;
          totalPapers: number;
        }
      >();

      for (const tt of timetableRows) {
        const key = `${tt.examDay}:${tt.slot}`;
        if (!slotMap.has(key)) {
          slotMap.set(key, {
            examDay: tt.examDay,
            examDate: tt.examDate.toISOString().slice(0, 10),
            slot: tt.slot as "MORNING" | "AFTERNOON",
            subjectCodes: new Set(),
            totalPapers: 0,
          });
        }
        const entry = slotMap.get(key)!;
        entry.subjectCodes.add(tt.subject.code);
        entry.totalPapers += tt._count.papers;
      }

      // Group actual block allocations by day+slot -> blockId -> subjectCodes
      const allocMap = new Map<string, Map<string, Set<string>>>();
      for (const a of allocRows) {
        const key = `${a.examDay}:${a.slot}`;
        if (!allocMap.has(key)) allocMap.set(key, new Map());
        const bMap = allocMap.get(key)!;
        if (!bMap.has(a.blockId)) bMap.set(a.blockId, new Set());
        bMap.get(a.blockId)!.add(a.candidatePaper.timetableEntry.subject.code);
      }

      const slotInputs: SupervisionSlotInput[] = [];
      for (const [key, info] of slotMap.entries()) {
        const bMap = allocMap.get(key);
        const activeBlocks: SupervisionSlotInput["activeBlocks"] = [];

        if (bMap && bMap.size > 0) {
          for (const blk of blockRows) {
            const subs = bMap.get(blk.id);
            if (subs) {
              activeBlocks.push({
                blockId: blk.id,
                blockNo: blk.blockNo,
                roomNo: blk.room.roomNo,
                building: blk.room.building,
                floor: blk.room.floor,
                subjectCodes: Array.from(subs),
              });
            }
          }
        } else {
          // Fallback: estimate needed blocks from paper count if bench arrangement not yet generated
          let remaining = info.totalPapers;
          for (const blk of blockRows) {
            if (remaining <= 0) break;
            activeBlocks.push({
              blockId: blk.id,
              blockNo: blk.blockNo,
              roomNo: blk.room.roomNo,
              building: blk.room.building,
              floor: blk.room.floor,
              subjectCodes: Array.from(info.subjectCodes),
            });
            remaining -= blk.strength;
          }
        }

        slotInputs.push({
          examDay: info.examDay,
          examDate: info.examDate,
          slot: info.slot,
          activeBlocks,
          allSubjectCodes: Array.from(info.subjectCodes),
        });
      }

      const existingInputs: ExistingDutyInput[] = existingDutyRows.map((d) => ({
        staffId: d.staffId,
        examDay: d.examDay,
        examDate: d.examDate.toISOString().slice(0, 10),
        slot: d.slot as "MORNING" | "AFTERNOON",
        blockId: d.blockId,
        role: d.role as "JUNIOR" | "RELIEVER" | "SENIOR",
        isOverride: d.isOverride,
      }));

      const result = allocateSupervisors(staffInputs, slotInputs, existingInputs, {
        relieversPerNBlocks: Number(relieversPerNBlocks) || 4,
        seniorCount: Number(seniorCount) || 1,
        avoidOwnSubject: Boolean(avoidOwnSubject),
        avoidBackToBack: Boolean(avoidBackToBack),
      });

      const maxVersion = existingDutyRows.reduce((m, d) => Math.max(m, d.version), 0);
      const nextVersion = maxVersion + 1;

      // Delete non-override duties for the target slots
      await tx.supervisionDuty.deleteMany({
        where: {
          sessionId: activeSession.id,
          isOverride: false,
          ...(mode === "DAY_SLOT" ? { examDay: Number(examDay), slot } : {}),
        },
      });

      const toInsert = result.duties
        .filter((d) => !d.isOverride)
        .map((d) => ({
          instituteId: instId,
          sessionId: activeSession.id,
          examDay: d.examDay,
          examDate: new Date(`${d.examDate}T00:00:00.000Z`),
          slot: d.slot,
          blockId: d.blockId,
          staffId: d.staffId,
          role: d.role,
          version: nextVersion,
          isOverride: false,
        }));

      if (toInsert.length > 0) {
        await tx.supervisionDuty.createMany({
          data: toInsert,
          skipDuplicates: true,
        });
      }

      return {
        allocatedCount: toInsert.length,
        unfilledCount: result.unfilledSlots.length,
        unfilledSlots: result.unfilledSlots.slice(0, 10),
        staffLoad: result.staffLoad,
        version: nextVersion,
      };
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: mode === "SESSION" ? "SUPERVISION_SESSION_ALLOCATED" : "SUPERVISION_SLOT_ALLOCATED",
      entity: "SupervisionDuty",
      afterData: { mode, examDay, slot, allocatedCount: outcome.allocatedCount, version: outcome.version },
    });

    return NextResponse.json({ success: true, ...outcome });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to allocate supervisors" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dutyId, newStaffId, reason } = await req.json();
    if (!dutyId || !newStaffId) {
      return NextResponse.json({ error: "dutyId and newStaffId are required" }, { status: 400 });
    }

    const instId = session.instituteId;

    const updated = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const duty = await tx.supervisionDuty.findFirst({
        where: { id: dutyId, instituteId: instId },
      });
      if (!duty) throw new Error("Duty not found");

      const conflict = await tx.supervisionDuty.findFirst({
        where: {
          sessionId: duty.sessionId,
          examDay: duty.examDay,
          slot: duty.slot,
          staffId: newStaffId,
          id: { not: dutyId },
        },
      });
      if (conflict) {
        throw new Error("Selected staff member already has a duty in this Day & Slot");
      }

      return tx.supervisionDuty.update({
        where: { id: dutyId },
        data: {
          staffId: newStaffId,
          isOverride: true,
          version: duty.version + 1,
        },
      });
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: "SUPERVISION_MANUAL_OVERRIDE",
      entity: "SupervisionDuty",
      entityId: dutyId,
      reason: reason || "Manual OIC override",
      afterData: { newStaffId },
    });

    return NextResponse.json({ success: true, duty: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Override failed" }, { status: 400 });
  }
}
