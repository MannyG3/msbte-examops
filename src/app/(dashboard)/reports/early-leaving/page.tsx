import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPostExamSlotData } from "@/lib/reports/post-exam-data";
import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function EarlyLeavingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; slot?: string }>;
}) {
  const sp = await searchParams;
  const day = Number(sp.day || "1");
  const slot = (sp.slot || "MORNING") as "MORNING" | "AFTERNOON";
  const data = await getPostExamSlotData(day, slot);
  const dateStr = formatMsbteDate(data.entries[0]?.examDate);

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar title={`Early Leaving Record — Day ${day} (${slot})`} />

      <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <div className="text-sm font-extrabold uppercase mt-0.5">EARLY LEAVING RECORD</div>
          <div className="text-xs">
            Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} | Date: {dateStr} | {slot}
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1.5">Sr.</th>
              <th className="border border-black px-2 py-1.5">Seat No</th>
              <th className="border border-black px-2 py-1.5">C-S-M</th>
              <th className="border border-black px-2 py-1.5">Time Out</th>
              <th className="border border-black px-2 py-1.5">Session</th>
              <th className="border border-black px-2 py-1.5 w-32">Supervisor Sign</th>
            </tr>
          </thead>
          <tbody>
            {data.earlyLeavings.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-black px-2 py-6 text-center text-slate-500">
                  No early leavers recorded for this session.
                </td>
              </tr>
            ) : (
              data.earlyLeavings.map((e, i) => (
                <tr key={e.id}>
                  <td className="border border-black px-2 py-1.5 text-center">{i + 1}</td>
                  <td className="border border-black px-2 py-1.5 font-mono font-semibold">{e.seatNo}</td>
                  <td className="border border-black px-2 py-1.5">{e.csm}</td>
                  <td className="border border-black px-2 py-1.5 text-center">{e.timeOut}</td>
                  <td className="border border-black px-2 py-1.5 text-center">{e.slot}</td>
                  <td className="border border-black px-2 py-1.5"></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
