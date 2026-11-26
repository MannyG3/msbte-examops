import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName = "msbte_results.csv", rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No result rows provided" }, { status: 400 });
    }

    const activeSession = await prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
    });

    if (!activeSession) {
      return NextResponse.json({ error: "No active session found" }, { status: 404 });
    }

    const resultImport = await prisma.resultImport.create({
      data: {
        sessionId: activeSession.id,
        fileName,
        totalRows: rows.length,
        rows: {
          create: rows.map((r: any) => ({
            seatNo: String(r.seatNo || "").trim(),
            enrollmentNo: String(r.enrollmentNo || "").trim(),
            courseCode: String(r.courseCode || "").trim(),
            headType: String(r.headType || "SA_TH").trim(),
            marksObtained: parseInt(r.marksObtained, 10) || 0,
            maxMarks: parseInt(r.maxMarks, 10) || 70,
            resultStatus: String(r.resultStatus || "PASS").trim().toUpperCase(),
          })),
        },
      },
    });

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "IMPORT_MSBTE_RESULTS",
      entity: "ResultImport",
      entityId: resultImport.id,
      afterData: { fileName, totalRows: rows.length },
    });

    return NextResponse.json({ success: true, importId: resultImport.id, count: rows.length });
  } catch (error: any) {
    console.error("Result import error:", error);
    return NextResponse.json({ error: error.message || "Failed to import results" }, { status: 500 });
  }
}
