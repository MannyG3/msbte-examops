import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { PrintToolbar } from "@/components/reports/print-toolbar";

export const dynamic = "force-dynamic";

export default async function ExaminerLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireTenantAuth();

  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const [institute, examiner, slots] = await Promise.all([
      tx.institute.findUnique({ where: { id: session.instituteId } }),
      tx.examiner.findFirst({ where: { id, instituteId: session.instituteId } }),
      tx.practicalSlot.findMany({
        where: {
          instituteId: session.instituteId,
          OR: [{ internalExaminerId: id }, { externalExaminerId: id }],
        },
        orderBy: { examDate: "asc" },
      }),
    ]);
    return { institute, examiner, slots };
  });

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar
        title={`Examiner Appointment Letter — ${data.examiner?.name ?? ""}`}
        backHref="/practicals/examiners"
      />
      {!data.examiner ? (
        <div className="bg-white p-8 rounded-xl border text-center text-sm text-slate-500">Examiner not found.</div>
      ) : (
        <div className="bg-white border border-slate-300 p-8 shadow-sm print:shadow-none print:border-none text-black space-y-4 text-xs">
          <div className="text-center border-b-2 border-black pb-3">
            <div className="font-bold uppercase">{data.institute?.name} (Centre: {data.institute?.examCentreCode ?? data.institute?.code})</div>
            <div className="text-sm font-extrabold uppercase mt-1">
              APPOINTMENT OF {data.examiner.type} PRACTICAL EXAMINER
            </div>
          </div>
          <p>
            <strong>To:</strong> {data.examiner.name}, {data.examiner.designation}, {data.examiner.instituteName}
          </p>
          <p className="leading-relaxed">
            Sir/Madam, you are hereby appointed as <strong>{data.examiner.type} Examiner</strong> for MSBTE Practical / Oral
            Examination (Subject Code: <strong>{data.examiner.subjectCode}</strong>) as per the schedule below:
          </p>
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black px-2 py-1.5">Date</th>
                <th className="border border-black px-2 py-1.5">Time</th>
                <th className="border border-black px-2 py-1.5">C-S-M</th>
                <th className="border border-black px-2 py-1.5">Batch</th>
                <th className="border border-black px-2 py-1.5">Lab</th>
              </tr>
            </thead>
            <tbody>
              {data.slots.map((s) => (
                <tr key={s.id}>
                  <td className="border border-black px-2 py-1.5 text-center">{s.examDate.toISOString().slice(0, 10)}</td>
                  <td className="border border-black px-2 py-1.5 text-center">{s.timeSlot}</td>
                  <td className="border border-black px-2 py-1.5 text-center">{s.csm}</td>
                  <td className="border border-black px-2 py-1.5 text-center">{s.batchName}</td>
                  <td className="border border-black px-2 py-1.5 text-center">{s.labName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pt-12 flex justify-between font-semibold">
            <div>Officer In-Charge (Exam)</div>
            <div>Principal</div>
          </div>
        </div>
      )}
    </div>
  );
}
