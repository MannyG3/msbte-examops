import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const { instituteId, reason } = await req.json();
    if (!instituteId || !reason) {
      return NextResponse.json({ error: "Institute ID and reason are required" }, { status: 400 });
    }

    const institute = await prisma.institute.findUnique({ where: { id: instituteId } });
    if (!institute) {
      return NextResponse.json({ error: "Institute not found" }, { status: 404 });
    }

    const impLog = await prisma.impersonationLog.create({
      data: {
        superAdminId: session.userId,
        instituteId: institute.id,
        reason,
      },
    });

    await setSessionCookie({
      userId: session.userId,
      email: session.email,
      name: session.name,
      isSuperAdmin: true,
      instituteId: institute.id,
      instituteCode: institute.code,
      instituteName: institute.name,
      examCentreCode: institute.examCentreCode,
      role: "INSTITUTE_ADMIN",
      impersonationLogId: impLog.id,
      impersonatedByEmail: session.email,
    });

    return NextResponse.json({ success: true, redirectTo: "/dashboard" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Impersonation failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.impersonationLogId) {
      await prisma.impersonationLog.update({
        where: { id: session.impersonationLogId },
        data: { endedAt: new Date() },
      });
    }

    await setSessionCookie({
      userId: session.userId,
      email: session.email,
      name: session.name,
      isSuperAdmin: true,
      instituteId: null,
      instituteCode: null,
      instituteName: null,
      examCentreCode: null,
      role: "SUPER_ADMIN",
    });

    return NextResponse.json({ success: true, redirectTo: "/super-admin" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to exit impersonation" }, { status: 500 });
  }
}
