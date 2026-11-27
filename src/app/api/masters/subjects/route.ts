import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, name, abbreviation, schemeName = "K", hasSections = false } = await req.json();
    if (!code || !name || !abbreviation) {
      return NextResponse.json({ error: "Code, name, and abbreviation are required" }, { status: 400 });
    }

    const instId = session.instituteId;

    const subject = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const scheme = await tx.scheme.upsert({
        where: { instituteId_name: { instituteId: instId, name: schemeName.trim().toUpperCase() } },
        update: {},
        create: { instituteId: instId, name: schemeName.trim().toUpperCase(), isActive: true },
      });

      return tx.subject.upsert({
        where: {
          instituteId_schemeId_code: {
            instituteId: instId,
            schemeId: scheme.id,
            code: code.trim(),
          },
        },
        update: {
          name: name.trim().toUpperCase(),
          abbreviation: abbreviation.trim().toUpperCase(),
          hasSections: Boolean(hasSections),
        },
        create: {
          instituteId: instId,
          schemeId: scheme.id,
          code: code.trim(),
          name: name.trim().toUpperCase(),
          abbreviation: abbreviation.trim().toUpperCase(),
          hasSections: Boolean(hasSections),
        },
      });
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: "UPSERT_SUBJECT",
      entity: "Subject",
      entityId: subject.id,
      afterData: { code, name, schemeName, hasSections },
    });

    return NextResponse.json({ success: true, subject });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save subject" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subjectId, hasSections } = await req.json();
    const updated = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
      return tx.subject.update({
        where: { id: subjectId },
        data: { hasSections: Boolean(hasSections) },
      });
    });

    return NextResponse.json({ success: true, subject: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update subject" }, { status: 500 });
  }
}
