import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "examops_secret_key_change_in_production_2026"
);

export async function POST(req: Request) {
  try {
    const { enrollmentNo, seatNoOrRollNo } = await req.json();

    if (!enrollmentNo || !seatNoOrRollNo) {
      return NextResponse.json(
        { error: "Enrollment Number and Seat/Roll Number are required" },
        { status: 400 }
      );
    }

    const cleanEnroll = String(enrollmentNo).trim();
    const cleanSecond = String(seatNoOrRollNo).trim();

    const student = await prisma.student.findFirst({
      where: {
        enrollmentNo: cleanEnroll,
        OR: [{ seatNo: cleanSecond }, { rollNo: cleanSecond }],
      },
      include: { institute: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: "No matching student record found. Check Enrollment No & Seat/Roll No." },
        { status: 401 }
      );
    }

    const token = await new SignJWT({
      studentId: student.id,
      instituteId: student.instituteId,
      enrollmentNo: student.enrollmentNo,
      name: student.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(SECRET_KEY);

    const cookieStore = await cookies();
    cookieStore.set("examops_student_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ success: true, student: { name: student.name, seatNo: student.seatNo } });
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
