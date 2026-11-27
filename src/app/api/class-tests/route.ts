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
    const { csm, subjectCode, rows } = await req.json();
    if (!csm || !subjectCode || !Array.isArray(rows)) {
      return NextResponse.json({ error: "csm, subjectCode, and rows[] are required" }, { status: 400 });
    }
    const instId = session.instituteId;

    const savedCount = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      await assertTenantWritable(tx, instId);
      const activeSession = await tx.examSession.findFirst({
        where: { instituteId: instId },
        orderBy: { createdAt: "desc" },
      });
      if (!activeSession) throw new Error("No active session");

      let count = 0;
      for (const r of rows) {
        const seatNo = String(r.seatNo || "").trim();
        if (!seatNo) continue;
        const ct1Absent = Boolean(r.ct1Absent);
        const ct2Absent = Boolean(r.ct2Absent);
        const ct1 = ct1Absent ? 0 : Number(r.ct1Marks || 0);
        const ct2 = ct2Absent ? 0 : Number(r.ct2Marks || 0);
        // Spec: FA-TH averaging (a candidate absent from both gets zero)
        const faThAvg = ct1Absent && ct2Absent ? 0 : Number(((ct1 + ct2) / 2).toFixed(2));
        const attendancePct = Number(r.attendancePct ?? 100);
        const isDetained = attendancePct < 75;

        await tx.classTestMark.upsert({
          where: {
            sessionId_subjectCode_seatNo: {
              sessionId: activeSession.id,
              subjectCode,
              seatNo,
            },
          },
          update: {
            csm,
            ct1Marks: ct1Absent ? null : ct1,
            ct2Marks: ct2Absent ? null : ct2,
            ct1Absent,
            ct2Absent,
            faThAvg,
            attendancePct,
            isDetained,
          },
          create: {
            instituteId: instId,
            sessionId: activeSession.id,
            csm,
            subjectCode,
            seatNo,
            ct1Marks: ct1Absent ? null : ct1,
            ct2Marks: ct2Absent ? null : ct2,
            ct1Absent,
            ct2Absent,
            faThAvg,
            attendancePct,
            isDetained,
          },
        });
        count++;
      }
      return count;
    });

    return NextResponse.json({ success: true, savedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save CT marks" }, { status: 400 });
  }
}
