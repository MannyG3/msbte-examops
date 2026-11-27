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
    const { rows } = await req.json();
    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "rows[] required" }, { status: 400 });
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
        const csm = String(r.csm || "").trim();
        const subjectCode = String(r.subjectCode || "").trim();
        if (!seatNo || !csm || !subjectCode) continue;
        const marks = Number(r.marks || 0);
        const maxMarks = Number(r.maxMarks || 100);
        const status = String(r.status || (marks >= maxMarks * 0.4 ? "PASS" : "FAIL")).toUpperCase();

        await tx.resultRecord.upsert({
          where: {
            sessionId_subjectCode_seatNo: {
              sessionId: activeSession.id,
              subjectCode,
              seatNo,
            },
          },
          update: { csm, marks, maxMarks, status },
          create: {
            instituteId: instId,
            sessionId: activeSession.id,
            seatNo,
            csm,
            subjectCode,
            marks,
            maxMarks,
            status,
          },
        });
        count++;
      }
      return count;
    });

    return NextResponse.json({ success: true, savedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Result import failed" }, { status: 400 });
  }
}
