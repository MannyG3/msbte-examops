import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPostExamSlotData } from "@/lib/reports/post-exam-data";
import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function QpRecordPage({
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
      <PrintToolbar title={`Question Paper Record — Day ${day} (${slot})`} />

      <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <div className="text-sm font-extrabold uppercase mt-0.5">QUESTION PAPER ACCOUNT RECORD</div>
          <div className="text-xs font-semibold">
            Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} ({data.activeSession?.name})
          </div>
          <div className="text-xs mt-1">
            <strong>Day:</strong> {day} | <strong>Date:</strong> {dateStr} | <strong>Session:</strong> {slot}
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1.5">C-S-M</th>
              <th className="border border-black px-2 py-1.5">Subject</th>
              <th className="border border-black px-2 py-1.5">Received</th>
              <th className="border border-black px-2 py-1.5">Used</th>
              <th className="border border-black px-2 py-1.5">Returned</th>
              <th className="border border-black px-2 py-1.5">Extra</th>
              <th className="border border-black px-2 py-1.5">Less</th>
              <th className="border border-black px-2 py-1.5 w-24">Invigilator Sign</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.id}>
                <td className="border border-black px-2 py-1.5 font-semibold">{e.csm}</td>
                <td className="border border-black px-2 py-1.5">{e.subject.code} — {e.subject.abbreviation}</td>
                <td className="border border-black px-2 py-1.5 text-center">{e.qpInventory?.receivedCount ?? e.papers.length}</td>
                <td className="border border-black px-2 py-1.5 text-center">{e.qpInventory?.usedCount ?? "-"}</td>
                <td className="border border-black px-2 py-1.5 text-center">{e.qpInventory?.returnedCount ?? "-"}</td>
                <td className="border border-black px-2 py-1.5 text-center">{e.qpInventory?.extraCount ?? 0}</td>
                <td className="border border-black px-2 py-1.5 text-center">{e.qpInventory?.lessCount ?? 0}</td>
                <td className="border border-black px-2 py-1.5"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
