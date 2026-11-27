import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { DEFAULT_REPORT_TEMPLATES } from "@/lib/reports/default-templates";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const instId = session.instituteId;

    const templates = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      return tx.reportTemplate.findMany({
        where: { instituteId: instId, ...(key ? { key } : {}), isActive: true },
        orderBy: [{ key: "asc" }, { version: "desc" }],
      });
    });

    return NextResponse.json({ templates, defaults: DEFAULT_REPORT_TEMPLATES });
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
    const { key, title, html, css } = await req.json();
    if (!key || !title || !html) {
      return NextResponse.json({ error: "key, title, and html are required" }, { status: 400 });
    }
    const instId = session.instituteId;

    const saved = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const latest = await tx.reportTemplate.findFirst({
        where: { instituteId: instId, key },
        orderBy: { version: "desc" },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      await tx.reportTemplate.updateMany({
        where: { instituteId: instId, key, isActive: true },
        data: { isActive: false },
      });

      return tx.reportTemplate.create({
        data: {
          instituteId: instId,
          key,
          title,
          version: nextVersion,
          html,
          css: css ?? "",
          isActive: true,
        },
      });
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: "REPORT_TEMPLATE_SAVED",
      entity: "ReportTemplate",
      entityId: saved.id,
      afterData: { key, version: saved.version },
    });

    return NextResponse.json({ success: true, template: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
