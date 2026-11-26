import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

interface StudentImportRow {
  enrollmentNo: string;
  seatNo?: string;
  rollNo: string;
  name: string;
  semester: number;
  division?: string;
  batch?: string;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows, programmeCode = "CO" } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data rows provided" }, { status: 400 });
    }

    const programme = await prisma.programme.findFirst({
      where: {
        instituteId: session.instituteId,
        code: programmeCode,
      },
    });

    if (!programme) {
      return NextResponse.json({ error: `Programme ${programmeCode} not found` }, { status: 404 });
    }

    // Cache divisions and batches
    const divisions = await prisma.division.findMany({
      where: { programmeId: programme.id },
      include: { batches: true },
    });

    // Cache courses for automatic enrollment
    const courses = await prisma.course.findMany({
      where: { programmeId: programme.id },
      include: { scheme: true },
    });

    let accepted = 0;
    let fixed = 0;
    let rejected = 0;
    const errors: { row: number; error: string }[] = [];

    for (let index = 0; index < rows.length; index++) {
      const raw = rows[index];
      const rowNum = index + 1;

      // Clean fields
      const enrollmentNo = String(raw.enrollmentNo || "").trim();
      const name = String(raw.name || "").trim();
      const rollNo = String(raw.rollNo || "").trim();
      const seatNo = raw.seatNo ? String(raw.seatNo).trim() : null;
      let sem = parseInt(String(raw.semester), 10);
      const divName = (raw.division || "A").toString().trim().toUpperCase();
      const batchName = raw.batch ? String(raw.batch).trim().toUpperCase() : null;

      if (!enrollmentNo || enrollmentNo.length < 5) {
        rejected++;
        errors.push({ row: rowNum, error: "Invalid or missing Enrollment Number" });
        continue;
      }

      if (!name) {
        rejected++;
        errors.push({ row: rowNum, error: "Student name is required" });
        continue;
      }

      if (isNaN(sem) || sem < 1 || sem > 6) {
        fixed++; // Autocorrect to sem 1 if missing
        sem = 1;
      }

      try {
        // Find or create division
        let division = divisions.find((d) => d.semester === sem && d.name === divName);
        if (!division) {
          division = await prisma.division.create({
            data: {
              programmeId: programme.id,
              semester: sem,
              name: divName,
              academicYear: "2026-2027",
            },
            include: { batches: true },
          });
          divisions.push(division);
        }

        // Find or create batch if specified
        let batchId: string | null = null;
        if (batchName) {
          let batch = division.batches?.find((b) => b.name === batchName);
          if (!batch) {
            batch = await prisma.batch.create({
              data: {
                divisionId: division.id,
                name: batchName,
              },
            });
            division.batches?.push(batch);
          }
          batchId = batch.id;
        }

        // Upsert student
        const student = await prisma.student.upsert({
          where: {
            instituteId_enrollmentNo: {
              instituteId: session.instituteId,
              enrollmentNo,
            },
          },
          update: {
            name,
            rollNo: rollNo || enrollmentNo.slice(-4),
            seatNo: seatNo || undefined,
            semester: sem,
            divisionId: division.id,
            batchId,
          },
          create: {
            instituteId: session.instituteId,
            programmeId: programme.id,
            divisionId: division.id,
            batchId,
            enrollmentNo,
            seatNo,
            rollNo: rollNo || enrollmentNo.slice(-4),
            name,
            semester: sem,
            status: "REGULAR",
          },
        });

        // Auto enroll in regular courses for this semester (K scheme)
        const semCourses = courses.filter((c) => c.semester === sem && c.scheme.name === "K");
        for (const sc of semCourses) {
          await prisma.studentCourse.upsert({
            where: {
              studentId_courseId: {
                studentId: student.id,
                courseId: sc.id,
              },
            },
            update: {},
            create: {
              studentId: student.id,
              courseId: sc.id,
              type: "REGULAR",
            },
          });
        }

        accepted++;
      } catch (err: any) {
        rejected++;
        errors.push({ row: rowNum, error: err.message || "Database insert error" });
      }
    }

    await logAuditAction({
      instituteId: session.instituteId,
      userId: session.userId,
      action: "STUDENT_BULK_IMPORT",
      entity: "Student",
      afterData: { total: rows.length, accepted, fixed, rejected },
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: rows.length,
        accepted,
        fixed,
        rejected,
        errors,
      },
    });
  } catch (error: any) {
    console.error("Student Import API error:", error);
    return NextResponse.json({ error: error.message || "Failed to process import" }, { status: 500 });
  }
}
