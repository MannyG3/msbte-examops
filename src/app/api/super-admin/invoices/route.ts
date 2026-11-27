import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const invoices = await prisma.invoice.findMany({
      include: { institute: true },
      orderBy: { issuedAt: "desc" },
    });
    return NextResponse.json({ invoices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { instituteId, amountInr, companyName, notes } = await req.json();
    if (!instituteId || !amountInr) {
      return NextResponse.json({ error: "instituteId and amountInr are required" }, { status: 400 });
    }

    const base = Math.round(Number(amountInr));
    const gst = Math.round(base * 0.18);
    const total = base + gst;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

    const created = await prisma.invoice.create({
      data: {
        instituteId,
        invoiceNumber,
        companyName: companyName || "ExamOps Technologies",
        amountInr: base,
        gstInr: gst,
        totalInr: total,
        status: "SENT",
        notes: notes || null,
      },
      include: { institute: true },
    });

    return NextResponse.json({ success: true, invoice: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { invoiceId, status } = await req.json();
    if (!invoiceId || !["PAID", "SENT", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "invoiceId and valid status required" }, { status: 400 });
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, invoice: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
