import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { PrintToolbar } from "@/components/reports/print-toolbar";
import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function FullDutyChartPage() {
  const session = await requireTenantAuth();
  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const [institute, activeSession] = await Promise.all([
      tx.institute.findUnique({ where: { id: session.instituteId } }),
      tx.examSession.findFirst({
        where: { instituteId: session.instituteId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!activeSession) return { institute, activeSession: null, duties: [] };

    const duties = await tx.supervisionDuty.findMany({
      where: { sessionId: activeSession.id },
      include: { staff: true, block: { include: { room: true } } },
      orderBy: [{ examDay: "asc" }, { slot: "asc" }, { role: "asc" }, { blockId: "asc" }],
    });

    return { institute, activeSession, duties };
  });

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar
        title="Full-Session Supervisor Duty Chart"
        subtitle={`${data.duties.length} total duty assignments`}
        exportUrl="/api/reports/export?type=duty-chart"
        backHref="/supervision/allocate"
      />

      <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <div className="text-sm font-extrabold uppercase mt-0.5">
            FULL-SESSION SUPERVISION DUTY CHART
          </div>
          <div className="text-xs font-semibold">
            Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} ({data.activeSession?.name})
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1">Day</th>
              <th className="border border-black px-2 py-1">Date</th>
              <th className="border border-black px-2 py-1">Slot</th>
              <th className="border border-black px-2 py-1">Role</th>
              <th className="border border-black px-2 py-1">Block / Room</th>
              <th className="border border-black px-2 py-1 text-left">Supervisor Name</th>
              <th className="border border-black px-2 py-1">Dept</th>
            </tr>
          </thead>
          <tbody>
            {data.duties.map((d) => (
              <tr key={d.id}>
                <td className="border border-black px-2 py-1 text-center font-semibold">Day {d.examDay}</td>
                <td className="border border-black px-2 py-1 text-center">{formatMsbteDate(d.examDate)}</td>
                <td className="border border-black px-2 py-1 text-center">{d.slot}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{d.role}</td>
                <td className="border border-black px-2 py-1 text-center">
                  {d.block ? `B-${d.block.blockNo} (${d.block.room.roomNo})` : "All"}
                </td>
                <td className="border border-black px-2 py-1 font-medium">{d.staff.name}</td>
                <td className="border border-black px-2 py-1 text-center">{d.staff.department}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 flex justify-between text-xs font-semibold">
          <div>Officer In-Charge (Exam)</div>
          <div>Principal / Chief Controller</div>
        </div>
      </div>
    </div>
  );
}
