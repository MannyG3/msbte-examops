import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { CtMarksClient } from "./marks-client";

export default async function ClassTestMarksPage(props: {
  searchParams?: Promise<{ courseId?: string; divisionId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireAuth();

  const programmes = await prisma.programme.findMany({
    where: { instituteId: session.instituteId },
    select: { id: true },
  });
  const programmeIds = programmes.map((p) => p.id);

  const [activeSession, courses, divisions] = await Promise.all([
    prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
    }),
    prisma.course.findMany({
      where: { programmeId: { in: programmeIds }, hasTheory: true },
      include: {
        assessmentHeads: {
          where: { headType: "FA_TH" },
        },
      },
      orderBy: [{ semester: "asc" }, { code: "asc" }],
    }),
    prisma.division.findMany({
      where: { programmeId: { in: programmeIds } },
      include: {
        students: {
          orderBy: { rollNo: "asc" },
          include: {
            marks: true,
          },
        },
      },
      orderBy: [{ semester: "asc" }, { name: "asc" }],
    }),
  ]);

  const classTests = activeSession
    ? await prisma.classTest.findMany({
        where: { sessionId: activeSession.id },
      })
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <CtMarksClient
        activeSession={activeSession ? JSON.parse(JSON.stringify(activeSession)) : null}
        courses={JSON.parse(JSON.stringify(courses))}
        divisions={JSON.parse(JSON.stringify(divisions))}
        classTests={JSON.parse(JSON.stringify(classTests))}
        initialCourseId={searchParams?.courseId}
        initialDivisionId={searchParams?.divisionId}
      />
    </div>
  );
}
