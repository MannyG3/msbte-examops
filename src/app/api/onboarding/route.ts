import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession, setSessionCookie } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      examCentreCode,
      principalName,
      address,
      blockCount = 10,
      columns = 4,
      columnBreak = 9,
      numberingStyle = "SERPENTINE",
      sessionName = "Winter-2026",
      sessionCode = "W26",
      theoryStartDate = "2026-11-17",
      theoryEndDate = "2026-12-09",
      dpaAccepted,
    } = await req.json();

    if (!dpaAccepted) {
      return NextResponse.json(
        { error: "You must accept the DPDP Act 2023 Data Processing Agreement to continue." },
        { status: 400 }
      );
    }

    const instId = session.instituteId;

    const updatedInst = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const inst = await tx.institute.update({
        where: { id: instId },
        data: {
          examCentreCode: examCentreCode?.trim() || session.instituteCode,
          principalName: principalName?.trim() || "Principal",
          address: address?.trim() || "Maharashtra",
          dpaAcceptedAt: new Date(),
          dpaAcceptedBy: session.email,
          onboardingDone: true,
        },
      });

      // Bulk create rooms & blocks
      const existingBlocks = await tx.block.count({ where: { instituteId: instId } });
      if (existingBlocks === 0 && Number(blockCount) > 0) {
        const strength = Number(columns) * Number(columnBreak);
        for (let i = 1; i <= Math.min(50, Number(blockCount)); i++) {
          const roomNo = `R-${100 + i}`;
          const room = await tx.room.create({
            data: {
              instituteId: instId,
              roomNo,
              building: "Main Building",
              floor: Math.ceil(i / 5),
            },
          });
          await tx.block.create({
            data: {
              instituteId: instId,
              blockNo: i,
              roomId: room.id,
              columns: Number(columns),
              columnBreak: Number(columnBreak),
              strength,
              numberingStyle: numberingStyle === "STRAIGHT" ? "STRAIGHT" : "SERPENTINE",
            },
          });
        }
      }

      // Create initial session if none exists
      const existingSessions = await tx.examSession.count({ where: { instituteId: instId } });
      if (existingSessions === 0) {
        await tx.examSession.create({
          data: {
            instituteId: instId,
            name: sessionName,
            code: sessionCode.toUpperCase(),
            theoryStartDate: new Date(theoryStartDate),
            theoryEndDate: new Date(theoryEndDate),
            status: "ACTIVE",
          },
        });
      }

      return inst;
    });

    await setSessionCookie({
      ...session,
      examCentreCode: updatedInst.examCentreCode,
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: "ONBOARDING_COMPLETED",
      entity: "Institute",
      entityId: instId,
      afterData: {
        examCentreCode: updatedInst.examCentreCode,
        blockCount,
        dpaAcceptedAt: updatedInst.dpaAcceptedAt,
      },
    });

    return NextResponse.json({ success: true, redirectTo: "/dashboard" });
  } catch (error: any) {
    console.error("Onboarding API error:", error);
    return NextResponse.json({ error: error.message || "Onboarding failed" }, { status: 500 });
  }
}
