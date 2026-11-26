import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PlannerClient } from "./planner-client";

export default async function PracticalPlannerPage() {
  const session = await requireAuth();

  const activeSession = await prisma.examSession.findFirst({
    where: { instituteId: session.instituteId, isCurrent: true },
    include: {
      practicalSlots: {
        include: {
          course: {
            include: { assessmentHeads: true },
          },
          division: true,
          batch: true,
          room: true,
          internalExaminer: true,
          externalExaminer: true,
        },
        orderBy: [{ examDate: "asc" }, { startTime: "asc" }, { courseId: "asc" }],
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PlannerClient
        activeSession={activeSession ? JSON.parse(JSON.stringify(activeSession)) : null}
      />
    </div>
  );
}
