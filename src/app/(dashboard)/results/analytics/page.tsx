import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { AnalyticsClient } from "./analytics-client";

export default async function ResultsAnalyticsPage() {
  const session = await requireAuth();

  const [activeSession, students, courses] = await Promise.all([
    prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
      include: {
        resultImports: {
          include: {
            rows: true,
          },
          orderBy: { importedAt: "desc" },
        },
      },
    }),
    prisma.student.findMany({
      where: { instituteId: session.instituteId },
      select: { seatNo: true, enrollmentNo: true, name: true, semester: true },
    }),
    prisma.course.findMany({
      where: { programme: { instituteId: session.instituteId } },
      select: { code: true, title: true, semester: true },
    }),
  ]);

  const allRows = activeSession?.resultImports?.flatMap((imp) => imp.rows) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <AnalyticsClient
        sessionCode={activeSession?.code || "W26"}
        rows={JSON.parse(JSON.stringify(allRows))}
        students={JSON.parse(JSON.stringify(students))}
        courses={JSON.parse(JSON.stringify(courses))}
      />
    </div>
  );
}
