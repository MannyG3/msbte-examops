import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        memberships: {
          where: { isActive: true },
          include: { institute: true },
          take: 1,
        },
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const membership = user.memberships[0];
    const institute = membership?.institute;

    if (!user.isSuperAdmin && institute?.status === "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Your 30-day trial request is pending founder approval." },
        { status: 403 }
      );
    }

    if (!user.isSuperAdmin && institute?.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "This institute workspace is suspended. Contact ExamOps support." },
        { status: 403 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      instituteId: institute?.id || null,
      instituteCode: institute?.code || null,
      instituteName: institute?.name || null,
      examCentreCode: institute?.examCentreCode || null,
      role: user.isSuperAdmin && !membership ? "SUPER_ADMIN" : membership?.role || "SUPERVISOR",
    });

    return NextResponse.json({
      success: true,
      isSuperAdmin: user.isSuperAdmin,
      onboardingDone: institute?.onboardingDone ?? true,
      redirectTo: user.isSuperAdmin && !membership ? "/super-admin" : institute && !institute.onboardingDone ? "/onboarding" : "/dashboard",
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
