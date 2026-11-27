import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { PracticalsClient } from "./practicals-client";

export const dynamic = "force-dynamic";

export default async function PracticalsExaminersPage() {
  const session = await requireTenantAuth();

  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const [activeSession, examiners, slots] = await Promise.all([
      tx.examSession.findFirst({
        where: { instituteId: session.instituteId },
        orderBy: { createdAt: "desc" },
      }),
      tx.examiner.findMany({
        where: { instituteId: session.instituteId },
        orderBy: { name: "asc" },
      }),
      tx.practicalSlot.findMany({
        where: { instituteId: session.instituteId },
        include: { internalExaminer: true, externalExaminer: true },
        orderBy: [{ examDate: "asc" }, { timeSlot: "asc" }],
      }),
    ]);

    return {
      sessionName: activeSession?.name ?? "No Active Session",
      examiners: examiners.map((e) => ({
        id: e.id,
        name: e.name,
        designation: e.designation,
        instituteName: e.instituteName,
        subjectCode: e.subjectCode,
        type: e.type,
        phone: e.phone ?? "",
      })),
      slots: slots.map((s) => ({
        id: s.id,
        csm: s.csm,
        subjectCode: s.subjectCode,
        batchName: s.batchName,
        labName: s.labName,
        examDate: s.examDate.toISOString().slice(0, 10),
        timeSlot: s.timeSlot,
        internalName: s.internalExaminer?.name ?? "—",
        externalName: s.externalExaminer?.name ?? "—",
      })),
    };
  });

  return <PracticalsClient initialData={data} />;
}
