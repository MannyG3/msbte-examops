import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ExaminersClient } from "./examiners-client";

export default async function ExternalExaminersPage() {
  const session = await requireAuth();

  const [examiners, activeSession] = await Promise.all([
    prisma.externalExaminer.findMany({
      where: { instituteId: session.instituteId },
      orderBy: { name: "asc" },
    }),
    prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
      include: {
        practicalSlots: {
          include: {
            course: { include: { assessmentHeads: true } },
            batch: true,
            division: true,
            externalExaminer: true,
          },
          orderBy: [{ examDate: "asc" }, { courseId: "asc" }],
        },
      },
    }),
  ]);

  const externalSlots = (activeSession?.practicalSlots || []).filter((s) =>
    s.course.assessmentHeads.some((h) => h.headType === "SA_PR" && h.tag === "EXTERNAL")
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ExaminersClient
        examiners={JSON.parse(JSON.stringify(examiners))}
        externalSlots={JSON.parse(JSON.stringify(externalSlots))}
      />
    </div>
  );
}
