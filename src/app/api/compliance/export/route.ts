import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withTenant } from "@/lib/prisma";
import { logAuditAction } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const instId = session.instituteId;

    const payload = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const [institute, sessions, blocks, staff, subjects, auditLogs] = await Promise.all([
        tx.institute.findUnique({ where: { id: instId } }),
        tx.examSession.findMany({
          where: { instituteId: instId },
          include: {
            candidates: true,
            timetableEntries: true,
            blockAllocations: true,
            supervisionDuties: true,
          },
        }),
        tx.block.findMany({ where: { instituteId: instId }, include: { room: true } }),
        tx.staff.findMany({ where: { instituteId: instId } }),
        tx.subject.findMany({ where: { instituteId: instId } }),
        tx.auditLog.findMany({ where: { instituteId: instId }, take: 200, orderBy: { createdAt: "desc" } }),
      ]);

      return {
        exportedAt: new Date().toISOString(),
        compliance: "India DPDP Act 2023 Data Portability Export",
        institute,
        sessions,
        blocks,
        staff,
        subjects,
        auditLogs,
      };
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: "DPDP_FULL_DATA_EXPORT",
      entity: "Institute",
      entityId: instId,
    });

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="examops-dpdp-export-${instId}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
