import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPreExamSlotData, formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function SupervisorAllocationReportPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; slot?: string }>;
}) {
  const sp = await searchParams;
  const day = Number(sp.day || "1");
  const slot = (sp.slot || "MORNING") as "MORNING" | "AFTERNOON";
  const data = await getPreExamSlotData(day, slot);

  const dateStr = formatMsbteDate(data.duties[0]?.examDate ?? data.entries[0]?.examDate);
  const seniors = data.duties.filter((d) => d.role === "SENIOR");
  const juniors = data.duties
    .filter((d) => d.role === "JUNIOR")
    .sort((a, b) => (a.block?.blockNo ?? 999) - (b.block?.blockNo ?? 999));
  const relievers = data.duties.filter((d) => d.role === "RELIEVER");

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar
        title={`Supervisor Allocation Report — Day ${day} (${slot})`}
        exportUrl={`/api/reports/export?type=supervisor-allocation&day=${day}&slot=${slot}`}
      />

      <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <div className="text-sm font-extrabold uppercase mt-0.5">
            SUPERVISOR ALLOCATION REPORT
          </div>
          <div className="text-xs font-semibold">
            Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} ({data.activeSession?.name})
          </div>
          <div className="text-xs mt-1">
            <strong>Day:</strong> {day} &nbsp;|&nbsp; <strong>Date:</strong> {dateStr} &nbsp;|&nbsp;{" "}
            <strong>Session:</strong> {slot}
          </div>
        </div>

        {data.duties.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No supervisor duties allocated for Day {day} ({slot}). Go to Supervision Allocation first.
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase mb-1.5">1. Senior Supervisor(s)</h3>
              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1.5 text-left">Name</th>
                    <th className="border border-black px-2 py-1.5 text-left">Department</th>
                    <th className="border border-black px-2 py-1.5 text-left">Designation</th>
                    <th className="border border-black px-2 py-1.5 w-32">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {seniors.map((s) => (
                    <tr key={s.id}>
                      <td className="border border-black px-2 py-1.5 font-semibold">{s.staff.name}</td>
                      <td className="border border-black px-2 py-1.5">{s.staff.department}</td>
                      <td className="border border-black px-2 py-1.5">{s.staff.designation}</td>
                      <td className="border border-black px-2 py-1.5"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase mb-1.5">2. Junior Supervisors (Block-Wise)</h3>
              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1.5 w-20 text-center">Block No</th>
                    <th className="border border-black px-2 py-1.5 w-24 text-center">Room</th>
                    <th className="border border-black px-2 py-1.5 text-left">Supervisor Name</th>
                    <th className="border border-black px-2 py-1.5 text-left">Dept</th>
                    <th className="border border-black px-2 py-1.5 w-32">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {juniors.map((j) => (
                    <tr key={j.id}>
                      <td className="border border-black px-2 py-1.5 text-center font-bold">
                        Block {j.block?.blockNo}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center">{j.block?.room.roomNo}</td>
                      <td className="border border-black px-2 py-1.5 font-semibold">{j.staff.name}</td>
                      <td className="border border-black px-2 py-1.5">{j.staff.department}</td>
                      <td className="border border-black px-2 py-1.5"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase mb-1.5">3. Relievers</h3>
              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1.5 text-left">Name</th>
                    <th className="border border-black px-2 py-1.5 text-left">Department</th>
                    <th className="border border-black px-2 py-1.5 w-32">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {relievers.map((r) => (
                    <tr key={r.id}>
                      <td className="border border-black px-2 py-1.5 font-semibold">{r.staff.name}</td>
                      <td className="border border-black px-2 py-1.5">{r.staff.department}</td>
                      <td className="border border-black px-2 py-1.5"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-12 flex justify-between text-xs font-semibold">
          <div>Officer In-Charge (Exam)</div>
          <div>Principal / Chief Controller</div>
        </div>
      </div>
    </div>
  );
}
