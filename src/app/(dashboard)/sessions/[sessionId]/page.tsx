import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SessionDetailClient } from "./session-detail-client";

export default async function SessionDetailPage(props: {
  params: Promise<{ sessionId: string }>;
}) {
  const params = await props.params;
  const session = await requireAuth();

  const examSession = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: {
      checklistItems: {
        orderBy: { dueDate: "asc" },
      },
      _count: {
        select: {
          theoryPapers: true,
          practicalSlots: true,
          supervisionDuties: true,
          resultImports: true,
        },
      },
    },
  });

  if (!examSession || examSession.instituteId !== session.instituteId) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SessionDetailClient examSession={JSON.parse(JSON.stringify(examSession))} />
    </div>
  );
}
