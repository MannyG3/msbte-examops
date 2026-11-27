import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sourceType = searchParams.get("sourceType");

    const templates = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
      return tx.importTemplate.findMany({
        where: {
          instituteId: session.instituteId!,
          ...(sourceType ? { sourceType: sourceType as any } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load templates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceType, name, columnMapping } = await req.json();
    if (!sourceType || !name || !columnMapping) {
      return NextResponse.json({ error: "sourceType, name, and columnMapping are required" }, { status: 400 });
    }

    const instId = session.instituteId;
    const template = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      return tx.importTemplate.upsert({
        where: {
          instituteId_sourceType_name: {
            instituteId: instId,
            sourceType,
            name: name.trim(),
          },
        },
        update: { columnMapping },
        create: {
          instituteId: instId,
          sourceType,
          name: name.trim(),
          columnMapping,
        },
      });
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save template" }, { status: 500 });
  }
}
