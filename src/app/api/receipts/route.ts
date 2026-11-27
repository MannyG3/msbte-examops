import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertTenantWritable } from "@/lib/plan-guard";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const examDay = Number(searchParams.get("day") || "1");
    const instId = session.instituteId;

    const data = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const [institute, activeSession] = await Promise.all([
        tx.institute.findUnique({ where: { id: instId } }),
        tx.examSession.findFirst({
          where: { instituteId: instId },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      if (!activeSession) return { institute, receipt: null, lastController: "" };

      const [receipt, lastReceipt] = await Promise.all([
        tx.dayReceipt.findFirst({ where: { sessionId: activeSession.id, examDay } }),
        tx.dayReceipt.findFirst({
          where: { sessionId: activeSession.id },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      return {
        institute,
        receipt,
        lastController: receipt?.controllerName || lastReceipt?.controllerName || "",
      };
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { examDay, controllerName, morningOpenTime, afternoonOpenTime, receiptTime, actualRowsJson } =
      await req.json();
    if (!examDay || !controllerName) {
      return NextResponse.json({ error: "examDay and controllerName are required" }, { status: 400 });
    }
    const instId = session.instituteId;

    const saved = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      await assertTenantWritable(tx, instId);
      const activeSession = await tx.examSession.findFirst({
        where: { instituteId: instId },
        orderBy: { createdAt: "desc" },
      });
      if (!activeSession) throw new Error("No active session");

      return tx.dayReceipt.upsert({
        where: { sessionId_examDay: { sessionId: activeSession.id, examDay: Number(examDay) } },
        update: {
          controllerName,
          morningOpenTime: morningOpenTime || "09:10 AM",
          afternoonOpenTime: afternoonOpenTime || "01:40 PM",
          receiptTime: receiptTime || "08:15 AM",
          actualRowsJson: actualRowsJson ?? undefined,
        },
        create: {
          instituteId: instId,
          sessionId: activeSession.id,
          examDay: Number(examDay),
          controllerName,
          morningOpenTime: morningOpenTime || "09:10 AM",
          afternoonOpenTime: afternoonOpenTime || "01:40 PM",
          receiptTime: receiptTime || "08:15 AM",
          actualRowsJson: actualRowsJson ?? undefined,
        },
      });
    });

    return NextResponse.json({ success: true, receipt: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save receipt" }, { status: 400 });
  }
}
