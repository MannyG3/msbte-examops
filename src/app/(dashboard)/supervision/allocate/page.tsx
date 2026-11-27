import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { SupervisionClient } from "./supervision-client";

export const dynamic = "force-dynamic";

export default async function SupervisionAllocatePage() {
  const session = await requireTenantAuth();
  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const activeSession = await tx.examSession.findFirst({
      where: { instituteId: session.instituteId },
      orderBy: { createdAt: "desc" },
    });

    if (!activeSession) {
      return {
        sessionName: "No Active Session",
        daySlots: [],
        staff: [],
        duties: [],
        swaps: [],
      };
    }

    const [timetable, staff, duties, swaps] = await Promise.all([
      tx.timetableEntry.findMany({
        where: { sessionId: activeSession.id },
        select: { examDay: true, examDate: true, slot: true },
        distinct: ["examDay", "slot"],
        orderBy: [{ examDay: "asc" }, { slot: "asc" }],
      }),
      tx.staff.findMany({
        where: { instituteId: activeSession.instituteId },
        orderBy: { name: "asc" },
      }),
      tx.supervisionDuty.findMany({
        where: { sessionId: activeSession.id },
        include: {
          staff: true,
          block: { include: { room: true } },
        },
        orderBy: [{ examDay: "asc" }, { slot: "asc" }, { role: "asc" }],
      }),
      tx.dutySwapRequest.findMany({
        where: { instituteId: activeSession.instituteId },
        include: {
          duty: { include: { block: { include: { room: true } } } },
          requester: true,
          target: true,
        },
        orderBy: { id: "desc" },
      }),
    ]);

    return {
      sessionName: activeSession.name,
      daySlots: timetable.map((t) => ({
        examDay: t.examDay,
        examDate: t.examDate.toISOString().slice(0, 10),
        slot: t.slot,
      })),
      staff: staff.map((s) => ({
        id: s.id,
        name: s.name,
        designation: s.designation,
        department: s.department,
        type: s.type,
        maxDutiesPerSession: s.maxDutiesPerSession,
      })),
      duties: duties.map((d) => ({
        id: d.id,
        examDay: d.examDay,
        examDate: d.examDate.toISOString().slice(0, 10),
        slot: d.slot,
        blockId: d.blockId,
        blockNo: d.block?.blockNo ?? null,
        roomNo: d.block?.room.roomNo ?? null,
        staffId: d.staffId,
        staffName: d.staff.name,
        staffDept: d.staff.department,
        role: d.role,
        version: d.version,
        isOverride: d.isOverride,
      })),
      swaps: swaps.map((sw) => ({
        id: sw.id,
        dutyId: sw.dutyId,
        examDay: sw.duty.examDay,
        slot: sw.duty.slot,
        role: sw.duty.role,
        blockNo: sw.duty.block?.blockNo ?? null,
        requesterName: sw.requester.name,
        targetName: sw.target.name,
        reason: sw.reason,
        status: sw.status,
      })),
    };
  });

  return <SupervisionClient initialData={data} />;
}
