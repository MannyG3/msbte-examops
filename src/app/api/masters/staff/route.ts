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

    const {
      name,
      designation = "Lecturer",
      department = "CO",
      type = "TEACHING",
      subjectsTaught = "",
      maxDutiesPerSession = 10,
      email = "",
      phone = "",
    } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Staff name is required" }, { status: 400 });
    }

    const instId = session.instituteId;
    const subjectsArr = String(subjectsTaught)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const staff = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      return tx.staff.create({
        data: {
          instituteId: instId,
          name: name.trim(),
          designation: designation.trim(),
          department: department.trim().toUpperCase(),
          type,
          subjectsTaught: subjectsArr,
          maxDutiesPerSession: Number(maxDutiesPerSession) || 10,
          unavailableDates: [],
          email: email.trim() || null,
          phone: phone.trim() || null,
        },
      });
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: "CREATE_STAFF",
      entity: "Staff",
      entityId: staff.id,
      afterData: { name: staff.name, department: staff.department, type: staff.type },
    });

    return NextResponse.json({ success: true, staff });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to add staff" }, { status: 500 });
  }
}
