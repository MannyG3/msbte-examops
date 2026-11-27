import { NextResponse } from "next/server";
import { withTenant } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

function parseDateFlexible(raw: string): Date | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    return new Date(`${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}T00:00:00Z`);
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function extractSchemeFromCsm(csm: string): string {
  const parts = csm.trim().toUpperCase().split(/[-_\s]+/);
  return parts[2] || "K";
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceType, rows } = await req.json();
    if (!sourceType || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "sourceType and rows are required" }, { status: 400 });
    }

    const instId = session.instituteId;

    const summary = await withTenant(instId, session.isSuperAdmin, async (tx) => {
      const activeSession = await tx.examSession.findFirst({
        where: { instituteId: instId },
        orderBy: { createdAt: "desc" },
      });

      if (!activeSession) {
        throw new Error("No active exam session found. Create a session first.");
      }

      let accepted = 0;
      let fixed = 0;
      let rejected = 0;
      const errors: { row: number; error: string }[] = [];

      if (sourceType === "TIMETABLE") {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const examDay = parseInt(String(r.examDay || ""), 10);
          const examDate = parseDateFlexible(r.examDate);
          const rawSlot = String(r.slot || "").trim().toUpperCase();
          const slot = rawSlot.startsWith("M") ? "MORNING" : rawSlot.startsWith("A") ? "AFTERNOON" : null;
          const subjectCode = String(r.subjectCode || "").trim();
          const subjectName = String(r.subjectName || "").trim().toUpperCase();
          const csm = String(r.csm || "").trim().toUpperCase();

          if (!examDay || !examDate || !slot || !subjectCode || !csm) {
            rejected++;
            errors.push({ row: i + 1, error: "Missing required Day, Date, Slot (M/A), Subject Code, or C-S-M" });
            continue;
          }

          let timeRange = String(r.timeRange || "").trim();
          if (!timeRange) {
            timeRange = slot === "MORNING" ? "09:30 A.M. to 12:30 P.M." : "02:00 P.M. to 05:00 P.M.";
            fixed++;
          }

          const schemeName = extractSchemeFromCsm(csm);
          const scheme = await tx.scheme.upsert({
            where: { instituteId_name: { instituteId: instId, name: schemeName } },
            update: {},
            create: { instituteId: instId, name: schemeName },
          });

          const abbr = subjectName.split(/\s+/).map((w) => w[0]).join("").slice(0, 4) || subjectCode.slice(-3);
          const subject = await tx.subject.upsert({
            where: { instituteId_schemeId_code: { instituteId: instId, schemeId: scheme.id, code: subjectCode } },
            update: { name: subjectName || `SUBJECT ${subjectCode}` },
            create: {
              instituteId: instId,
              schemeId: scheme.id,
              code: subjectCode,
              name: subjectName || `SUBJECT ${subjectCode}`,
              abbreviation: abbr,
            },
          });

          await tx.timetableEntry.upsert({
            where: {
              sessionId_examDay_slot_subjectId_csm: {
                sessionId: activeSession.id,
                examDay,
                slot,
                subjectId: subject.id,
                csm,
              },
            },
            update: { examDate, timeRange },
            create: {
              instituteId: instId,
              sessionId: activeSession.id,
              subjectId: subject.id,
              examDay,
              examDate,
              slot,
              timeRange,
              csm,
            },
          });
          accepted++;
        }
      } else if (sourceType === "QP_INVENTORY") {
        const entries = await tx.timetableEntry.findMany({
          where: { sessionId: activeSession.id },
          include: { subject: true },
        });

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const subjectCode = String(r.subjectCode || "").trim();
          const csm = String(r.csm || "").trim().toUpperCase();
          const dcCode = String(r.dcCode || "").trim();
          const ecCode = String(r.ecCode || "").trim();
          const qpCount = parseInt(String(r.qpCount || ""), 10);

          if (!subjectCode || isNaN(qpCount)) {
            rejected++;
            errors.push({ row: i + 1, error: "Missing Subject Code or invalid QP Count" });
            continue;
          }

          const entry = entries.find(
            (e) => e.subject.code === subjectCode && (!csm || e.csm === csm)
          );
          if (!entry) {
            rejected++;
            errors.push({ row: i + 1, error: `No TimetableEntry found for ${subjectCode} (${csm || "any C-S-M"})` });
            continue;
          }

          await tx.qPInventory.upsert({
            where: { timetableEntryId: entry.id },
            update: { dcCode: dcCode || "DC-01", ecCode: ecCode || "9999", qpCount },
            create: {
              instituteId: instId,
              timetableEntryId: entry.id,
              dcCode: dcCode || "DC-01",
              ecCode: ecCode || "9999",
              qpCount,
            },
          });
          accepted++;
        }
      } else if (sourceType === "SEATING_CHART") {
        const entries = await tx.timetableEntry.findMany({
          where: { sessionId: activeSession.id },
          include: { subject: true },
        });

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const seatNo = String(r.seatNo || "").trim();
          const instCode = String(r.instCode || session.instituteCode || "").trim();
          const csm = String(r.csm || "").trim().toUpperCase();
          const subjectCode = String(r.subjectCode || "").trim();
          const isDetained = ["true", "1", "yes", "det", "detained"].includes(
            String(r.isDetained || "").trim().toLowerCase()
          );

          if (!seatNo || !subjectCode || !csm) {
            rejected++;
            errors.push({ row: i + 1, error: "Missing Seat No, Subject Code, or C-S-M" });
            continue;
          }

          const entry = entries.find(
            (e) => e.subject.code === subjectCode && e.csm === csm
          ) || entries.find((e) => e.subject.code === subjectCode);

          if (!entry) {
            rejected++;
            errors.push({ row: i + 1, error: `Timetable entry missing for ${subjectCode} (${csm})` });
            continue;
          }

          const candidate = await tx.candidate.upsert({
            where: { sessionId_seatNo: { sessionId: activeSession.id, seatNo } },
            update: {
              instCode: instCode || "9999",
              csm,
              name: r.name ? String(r.name).trim() : undefined,
              enrollmentNo: r.enrollmentNo ? String(r.enrollmentNo).trim() : undefined,
              isDetained,
            },
            create: {
              instituteId: instId,
              sessionId: activeSession.id,
              seatNo,
              instCode: instCode || "9999",
              csm,
              name: r.name ? String(r.name).trim() : null,
              enrollmentNo: r.enrollmentNo ? String(r.enrollmentNo).trim() : null,
              isDetained,
            },
          });

          await tx.candidatePaper.upsert({
            where: { candidateId_timetableEntryId: { candidateId: candidate.id, timetableEntryId: entry.id } },
            update: { isDetained },
            create: {
              instituteId: instId,
              candidateId: candidate.id,
              timetableEntryId: entry.id,
              isDetained,
            },
          });
          accepted++;
        }
      } else if (sourceType === "MARKSHEET") {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const seatNo = String(r.seatNo || "").trim();
          const subjectCode = String(r.subjectCode || "").trim();
          const marksheetNo = String(r.marksheetNo || "").trim();

          if (!seatNo || !subjectCode || !marksheetNo) {
            rejected++;
            errors.push({ row: i + 1, error: "Missing Seat No, Subject Code, or Marksheet No" });
            continue;
          }

          await tx.marksheetRecord.create({
            data: {
              instituteId: instId,
              sessionId: activeSession.id,
              seatNo,
              subjectCode,
              marksheetNo,
              marks: r.marks ? parseInt(String(r.marks), 10) || null : null,
              status: r.status ? String(r.status).trim() : null,
            },
          });
          accepted++;
        }
      }

      return { total: rows.length, accepted, fixed, rejected, errors };
    });

    await logAuditAction({
      instituteId: instId,
      userId: session.userId,
      action: `IMPORT_${sourceType}`,
      entity: sourceType,
      afterData: summary,
    });

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error("Import API error:", error);
    return NextResponse.json({ error: error.message || "Import failed" }, { status: 500 });
  }
}
