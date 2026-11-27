import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPreExamSlotData, formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function QpRequirementReportPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; slot?: string }>;
}) {
  const sp = await searchParams;
  const day = Number(sp.day || "1");
  const slot = (sp.slot || "MORNING") as "MORNING" | "AFTERNOON";
  const data = await getPreExamSlotData(day, slot);

  const dateStr = formatMsbteDate(data.entries[0]?.examDate);
  const totalQps = data.entries.reduce((acc, e) => acc + e._count.papers, 0);

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar
        title={`Advanced QP Requirement — Day ${day} (${slot})`}
        exportUrl={`/api/reports/export?type=qp-requirement&day=${day}&slot=${slot}`}
      />

      <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <div className="text-sm font-extrabold uppercase mt-0.5">
            ADVANCED QUESTION PAPER REQUIREMENT REPORT
          </div>
          <div className="text-xs font-semibold">
            Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} ({data.activeSession?.name})
          </div>
          <div className="text-xs mt-1">
            <strong>Day:</strong> {day} &nbsp;|&nbsp; <strong>Date:</strong> {dateStr} &nbsp;|&nbsp;{" "}
            <strong>Session:</strong> {slot}
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1.5 w-10 text-center">Sr.</th>
              <th className="border border-black px-2 py-1.5">C-S-M</th>
              <th className="border border-black px-2 py-1.5">Subject Code</th>
              <th className="border border-black px-2 py-1.5 text-left">Subject Name</th>
              <th className="border border-black px-2 py-1.5">Time</th>
              <th className="border border-black px-2 py-1.5 text-right">Candidates / QPs</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e, i) => (
              <tr key={e.id}>
                <td className="border border-black px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-black px-2 py-1.5 font-semibold">{e.csm}</td>
                <td className="border border-black px-2 py-1.5 font-mono">{e.subject.code}</td>
                <td className="border border-black px-2 py-1.5">
                  {e.subject.name} ({e.subject.abbreviation})
                </td>
                <td className="border border-black px-2 py-1.5 text-center">{e.timeRange}</td>
                <td className="border border-black px-2 py-1.5 text-right font-bold">{e._count.papers}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={5} className="border border-black px-2 py-1.5 text-right">
                TOTAL QUESTION PAPERS REQUIRED:
              </td>
              <td className="border border-black px-2 py-1.5 text-right">{totalQps}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-12 flex justify-between text-xs font-semibold">
          <div>Prepared By (Exam Cell)</div>
          <div>Officer In-Charge (Exam)</div>
        </div>
      </div>
    </div>
  );
}
