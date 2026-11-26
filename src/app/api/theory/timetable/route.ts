import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseSchemeString, normalizeTimeSlot } from "@/lib/parsers/msbte-scheme-parser";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows, sessionId } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No timetable rows provided" }, { status: 400 });
    }

    const currentSession = sessionId
      ? await prisma.examSession.findUnique({ where: { id: sessionId } })
      : await prisma.examSession.findFirst({
          where: { instituteId: session.instituteId, isCurrent: true },
        });

    if (!currentSession) {
      return NextResponse.json({ error: "No active exam session found" }, { status: 404 });
    }

    // Pre-load existing programmes and schemes for this institute
    const [programmes, schemes, courses] = await Promise.all([
      prisma.programme.findMany({ where: { instituteId: session.instituteId } }),
      prisma.scheme.findMany({ where: { instituteId: session.instituteId } }),
      prisma.course.findMany({ where: { programme: { instituteId: session.instituteId } } }),
    ]);

    let imported = 0;
    let errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const parsedScheme = parseSchemeString(row.schemeString);

      // Resolve or find Course
      let course = courses.find((c) => c.code === String(row.paperCode).trim());

      // If course doesn't exist, create it under matched programme & scheme
      if (!course) {
        let prog = programmes.find((p) => p.code === parsedScheme.programme) || programmes[0];
        let sch = schemes.find((s) => s.name === parsedScheme.scheme) || schemes[0];

        if (prog && sch) {
          course = await prisma.course.create({
            data: {
              programmeId: prog.id,
              schemeId: sch.id,
              code: String(row.paperCode).trim(),
              title: row.paperName || `Course ${row.paperCode}`,
              abbreviation: String(row.paperCode).slice(-3),
              semester: parsedScheme.semester || 1,
              hasTheory: true,
              hasPractical: false,
            },
          });
          courses.push(course);

          // Add default SA-TH head for end-semester paper
          await prisma.assessmentHead.create({
            data: {
              courseId: course.id,
              headType: "SA_TH",
              maxMarks: 70,
              minMarks: 28,
              tag: "EXTERNAL",
              durationMins: 180,
            },
          });
        }
      }

      if (!course) {
        errors.push(`Row ${i + 1}: Could not link course for code ${row.paperCode}`);
        continue;
      }

      const slotNorm = normalizeTimeSlot(row.slot, row.startTime, row.endTime);

      // Parse exam date
      let examDate: Date;
      try {
        examDate = new Date(row.examDate);
        if (isNaN(examDate.getTime())) {
          // Try DD-MM-YYYY
          const parts = row.examDate.split(/[-/]/);
          if (parts.length === 3) {
            examDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            examDate = new Date();
          }
        }
      } catch {
        examDate = new Date();
      }

      await prisma.theoryPaper.create({
        data: {
          sessionId: currentSession.id,
          courseId: course.id,
          examDate,
          slot: slotNorm.slot,
          startTime: slotNorm.startTime,
          endTime: slotNorm.endTime,
          schemeString: row.schemeString,
          parsedProgramme: parsedScheme.programme,
          parsedSemester: parsedScheme.semester,
          parsedScheme: parsedScheme.scheme,
          paperCode: String(row.paperCode).trim(),
          paperName: row.paperName,
        },
      });

      imported++;
    }

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "IMPORT_THEORY_TIMETABLE",
      entity: "TheoryPaper",
      afterData: { totalRows: rows.length, imported, errors },
    });

    return NextResponse.json({
      success: true,
      imported,
      errors,
    });
  } catch (error: any) {
    console.error("Timetable import API error:", error);
    return NextResponse.json({ error: error.message || "Failed to import timetable" }, { status: 500 });
  }
}
