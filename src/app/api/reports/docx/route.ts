import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getSession } from "@/lib/auth";
import { withTenant } from "@/lib/prisma";
import { loadOrFallbackDocxTemplate, renderDocxTemplate } from "@/lib/docx/engine";
import { buildCommonReportContext, RIT_FORMAT_FILES } from "@/lib/docx/rit-mappers";
import { convertDocxToPdf } from "@/lib/docx/gotenberg";

type FormatKey = keyof typeof RIT_FORMAT_FILES | "PRINT_PACK";

const FORMAT_TITLES: Record<keyof typeof RIT_FORMAT_FILES, string> = {
  BENCH_AND_GATE: "BENCH ARRANGEMENT & GATE CHART",
  ATTENDANCE: "ATTENDANCE REPORT — FORMAT No. 5",
  SUPERVISOR: "SUPERVISOR REPORT",
  PACKING_SLIP: "PACKING SLIP — FORMAT NO 7",
  FORMAT_3A: "FORMAT NO. 3A — ANNEXTURE - H (RECEIPT OF QP PACKETS)",
  ANNEXURE_G: "ANNEXURE - G / FORMAT NO -03",
  FORMAT_02: "FORMAT NO -02 (CONTROLLER RECEIPT)",
};

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = (searchParams.get("key") || "BENCH_AND_GATE").toUpperCase() as FormatKey;
    const output = (searchParams.get("output") || "docx").toLowerCase(); // docx | pdf | zip
    const day = Number(searchParams.get("day") || "1");
    const slot = (searchParams.get("slot") || "MORNING").toUpperCase() as "MORNING" | "AFTERNOON";
    const instId = session.instituteId;

    const payload = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const [institute, activeSession, templates] = await Promise.all([
        tx.institute.findUnique({ where: { id: instId } }),
        tx.examSession.findFirst({ where: { instituteId: instId }, orderBy: { createdAt: "desc" } }),
        tx.reportTemplate.findMany({ where: { instituteId: instId, isActive: true } }),
      ]);

      const entries = activeSession
        ? await tx.timetableEntry.findMany({
            where: { sessionId: activeSession.id, examDay: day, slot },
            include: { subject: true, _count: { select: { papers: true } } },
          })
        : [];

      const allocCount = activeSession
        ? await tx.blockAllocation.count({
            where: { sessionId: activeSession.id, examDay: day, slot },
          })
        : 0;

      return { institute, activeSession, templates, entries, allocCount };
    });

    const ctx = buildCommonReportContext({
      institute: payload.institute,
      sessionName: payload.activeSession?.name ?? "Winter-2026",
      examDay: day,
      examDate: payload.entries[0]?.examDate ?? new Date(),
      slot,
      summaryLine: `${payload.entries.length} papers, ${payload.allocCount} allocated seats`,
    });

    if (key === "PRINT_PACK" || output === "zip") {
      const zip = new JSZip();
      for (const fmtKey of Object.keys(RIT_FORMAT_FILES) as Array<keyof typeof RIT_FORMAT_FILES>) {
        const override = payload.templates.find((t) => t.key === fmtKey)?.docxBase64;
        const { buffer } = loadOrFallbackDocxTemplate(
          RIT_FORMAT_FILES[fmtKey],
          override,
          FORMAT_TITLES[fmtKey]
        );
        const rendered = renderDocxTemplate(buffer, ctx);
        zip.file(`${fmtKey}_Day${day}_${slot}.docx`, rendered);
      }
      const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
      return new NextResponse(new Uint8Array(zipBuf), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="ExamOps_PrintPack_Day${day}_${slot}.zip"`,
        },
      });
    }

    const fmtKey = key in RIT_FORMAT_FILES ? (key as keyof typeof RIT_FORMAT_FILES) : "BENCH_AND_GATE";
    const override = payload.templates.find((t) => t.key === fmtKey)?.docxBase64;
    const { buffer } = loadOrFallbackDocxTemplate(
      RIT_FORMAT_FILES[fmtKey],
      override,
      FORMAT_TITLES[fmtKey]
    );
    const renderedDocx = renderDocxTemplate(buffer, ctx);

    if (output === "pdf") {
      const pdfBuf = await convertDocxToPdf(renderedDocx, `${fmtKey}.docx`);
      return new NextResponse(new Uint8Array(pdfBuf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fmtKey}_Day${day}_${slot}.pdf"`,
        },
      });
    }

    return new NextResponse(new Uint8Array(renderedDocx), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fmtKey}_Day${day}_${slot}.docx"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Report generation failed" }, { status: 400 });
  }
}
