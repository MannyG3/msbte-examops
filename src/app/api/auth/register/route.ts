import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { instituteCode, instituteName, region, address, principalName, email, password, name, phone } = body;

    if (!instituteCode || !instituteName || !region || !email || !password) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }

    // Check if code or email exists
    const existingInstitute = await prisma.institute.findUnique({
      where: { code: instituteCode.trim() },
    });
    if (existingInstitute) {
      return NextResponse.json({ error: "Institute code already registered" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    // Create Institute & Coordinator User in transaction
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const institute = await tx.institute.create({
        data: {
          code: instituteCode.trim(),
          name: instituteName.trim(),
          region: region.trim(),
          address: address?.trim() || "Institute Address",
          principalName: principalName?.trim() || "Principal",
          logoUrl: "/logo.svg",
        },
      });

      const user = await tx.user.create({
        data: {
          instituteId: institute.id,
          email: email.toLowerCase().trim(),
          passwordHash,
          name: name?.trim() || "Exam Coordinator",
          phone: phone?.trim() || null,
          role: "COORDINATOR",
        },
      });

      // Default schemes
      await tx.scheme.createMany({
        data: [
          { instituteId: institute.id, name: "K", startYear: 2023, isActive: true },
          { instituteId: institute.id, name: "I", startYear: 2018, isActive: true },
        ],
      });

      // Default eligibility rule
      await tx.eligibilityRule.create({
        data: {
          instituteId: institute.id,
          minAttendancePct: 75.0,
          enforceFaPrPass: true,
        },
      });

      return { institute, user };
    });

    await logAuditAction({
      instituteId: result.institute.id,
      userId: result.user.id,
      action: "INSTITUTE_ONBOARDING",
      entity: "Institute",
      entityId: result.institute.id,
      afterData: { code: result.institute.code, name: result.institute.name },
    });

    await setSessionCookie({
      userId: result.user.id,
      instituteId: result.institute.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      instituteCode: result.institute.code,
      instituteName: result.institute.name,
    });

    return NextResponse.json({ success: true, instituteId: result.institute.id });
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
