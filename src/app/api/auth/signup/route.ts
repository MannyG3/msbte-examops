import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      instituteName,
      instituteCode,
      examCentreCode,
      region,
      address,
      contactPerson,
      contactPhone,
      email,
      password,
    } = body;

    if (!instituteName || !instituteCode || !region || !contactPerson || !email || !password) {
      return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 });
    }

    const existingInst = await prisma.institute.findUnique({
      where: { code: instituteCode.trim() },
    });
    if (existingInst) {
      return NextResponse.json({ error: "Institute code already registered" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const trialPlan = await prisma.plan.findUnique({ where: { name: "Trial" } });
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const institute = await tx.institute.create({
        data: {
          code: instituteCode.trim(),
          examCentreCode: examCentreCode?.trim() || instituteCode.trim(),
          name: instituteName.trim(),
          region: region.trim(),
          address: address?.trim() || `${region.trim()}, Maharashtra`,
          contactPerson: contactPerson.trim(),
          contactPhone: contactPhone?.trim() || null,
          contactEmail: email.toLowerCase().trim(),
          planId: trialPlan?.id || null,
          status: "PENDING_APPROVAL",
          onboardingDone: false,
        },
      });

      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          name: contactPerson.trim(),
          phone: contactPhone?.trim() || null,
          isSuperAdmin: false,
        },
      });

      await tx.membership.create({
        data: {
          instituteId: institute.id,
          userId: user.id,
          role: "INSTITUTE_ADMIN",
        },
      });

      // Seed default special codes for every new tenant
      await tx.specialCode.createMany({
        data: [
          { instituteId: institute.id, code: "AB", label: "Absent" },
          { instituteId: institute.id, code: "DET", label: "Detained" },
          { instituteId: institute.id, code: "CC", label: "Copy Case (UFM)" },
        ],
      });

      return { institute, user };
    });

    await logAuditAction({
      instituteId: result.institute.id,
      userId: result.user.id,
      action: "TRIAL_SIGNUP_SUBMITTED",
      entity: "Institute",
      entityId: result.institute.id,
      afterData: {
        code: result.institute.code,
        examCentreCode: result.institute.examCentreCode,
        status: "PENDING_APPROVAL",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Trial request submitted. You will be notified once approved by ExamOps.",
    });
  } catch (error) {
    console.error("Signup API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
