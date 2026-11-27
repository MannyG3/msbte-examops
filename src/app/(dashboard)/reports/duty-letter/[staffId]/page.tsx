import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { PrintToolbar } from "@/components/reports/print-toolbar";
import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function DutyLetterPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const { staffId } = await params;
  const session = await requireTenantAuth();

  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const [institute, activeSession, staff] = await Promise.all([
      tx.institute.findUnique({ where: { id: session.instituteId } }),
      tx.examSession.findFirst({
        where: { instituteId: session.instituteId },
        orderBy: { createdAt: "desc" },
      }),
      tx.staff.findFirst({
        where: { id: staffId, instituteId: session.instituteId },
      }),
    ]);

    if (!activeSession || !staff) return { institute, activeSession, staff, duties: [] };

    const duties = await tx.supervisionDuty.findMany({
      where: { sessionId: activeSession.id, staffId: staff.id },
      include: { block: { include: { room: true } } },
      orderBy: [{ examDay: "asc" }, { slot: "asc" }],
    });

    return { institute, activeSession, staff, duties };
  });

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar
        title={`Individual Duty Order — ${data.staff?.name ?? "Staff"}`}
        backHref="/supervision/allocate"
      />

      {!data.staff ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
          Staff member not found.
        </div>
      ) : (
        <div className="bg-white border border-slate-300 p-8 shadow-sm print:shadow-none print:border-none text-black space-y-4">
          <div className="text-center border-b-2 border-black pb-3">
            <div className="text-xs font-bold uppercase">
              {data.institute?.name} (MSBTE Centre Code: {data.institute?.examCentreCode ?? data.institute?.code})
            </div>
            <div className="text-sm font-extrabold uppercase mt-1">
              EXAMINATION SUPERVISION DUTY APPOINTMENT LETTER
            </div>
            <div className="text-xs font-semibold">Session: {data.activeSession?.name}</div>
          </div>

          <div className="text-xs space-y-1">
            <div>
              <strong>To:</strong> {data.staff.name} ({data.staff.designation}, Dept: {data.staff.department})
            </div>
            <div>
              <strong>Subject:</strong> Appointment as Examination Supervisor for MSBTE {data.activeSession?.name}
            </div>
          </div>

          <p className="text-xs leading-relaxed">
            Sir/Madam, you are hereby appointed for examination supervision duties as detailed below. Please report to the
            Examination Control Room at least <strong>30 minutes prior</strong> to the commencement of the session.
          </p>

          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black px-2 py-1.5">Sr.</th>
                <th className="border border-black px-2 py-1.5">Exam Day</th>
                <th className="border border-black px-2 py-1.5">Date</th>
                <th className="border border-black px-2 py-1.5">Session</th>
                <th className="border border-black px-2 py-1.5">Role</th>
                <th className="border border-black px-2 py-1.5">Block / Room</th>
              </tr>
            </thead>
            <tbody>
              {data.duties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-black px-2 py-4 text-center text-slate-500">
                    No duties assigned in this session.
                  </td>
                </tr>
              ) : (
                data.duties.map((d, i) => (
                  <tr key={d.id}>
                    <td className="border border-black px-2 py-1.5 text-center">{i + 1}</td>
                    <td className="border border-black px-2 py-1.5 text-center">Day {d.examDay}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{formatMsbteDate(d.examDate)}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{d.slot}</td>
                    <td className="border border-black px-2 py-1.5 text-center font-semibold">{d.role}</td>
                    <td className="border border-black px-2 py-1.5 text-center">
                      {d.block ? `Block ${d.block.blockNo} (${d.block.room.roomNo})` : "Control / Floor"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="pt-12 flex justify-between text-xs font-semibold">
            <div>Received By (Staff Signature)</div>
            <div>Officer In-Charge / Principal</div>
          </div>
        </div>
      )}
    </div>
  );
}
