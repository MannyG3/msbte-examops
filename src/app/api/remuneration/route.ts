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
    const { rates } = await req.json(); // Array<{ role, ratePerDuty }>
    if (!Array.isArray(rates)) {
      return NextResponse.json({ error: "rates[] required" }, { status: 400 });
    }
    const instId = session.instituteId;

    await withTenant(instId, session.isSuperAdmin, async (tx) => {
      await assertTenantWritable(tx, instId);
      for (const r of rates) {
        await tx.remunerationRate.upsert({
          where: { instituteId_role: { instituteId: instId, role: r.role } },
          update: { ratePerDuty: Number(r.ratePerDuty) },
          create: { instituteId: instId, role: r.role, ratePerDuty: Number(r.ratePerDuty) },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save rates" }, { status: 400 });
  }
}
