import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPostExamSlotData } from "@/lib/reports/post-exam-data";
import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function AnswerBooksReportPage({
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
      <PrintToolbar title={`Answer Book & Stationery Record — Day ${day} (${slot})`} />

      <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <div className="text-sm font-extrabold uppercase mt-0.5">
            ANSWER BOOK & STATIONERY RECORD
          </div>
          <div className="text-xs">
            Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} | Date: {dateStr} | {slot}
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1.5">Block / Room</th>
              <th className="border border-black px-2 py-1.5">Main (Prov / Used)</th>
              <th className="border border-black px-2 py-1.5">Supp (Prov / Used)</th>
              <th className="border border-black px-2 py-1.5">Drawing (Prov / Used)</th>
              <th className="border border-black px-2 py-1.5">Graph (Prov / Used)</th>
              <th className="border border-black px-2 py-1.5 w-28">Signatures</th>
            </tr>
          </thead>
          <tbody>
            {data.answerBookRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-black px-2 py-6 text-center text-slate-500">
                  No stationery records entered yet for this session.
                </td>
              </tr>
            ) : (
              data.answerBookRecords.map((r) => (
                <tr key={r.id}>
                  <td className="border border-black px-2 py-1.5 font-semibold">
                    Block {r.block.blockNo} ({r.block.room.roomNo})
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {r.mainProvided} / {r.mainUsed}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {r.suppProvided} / {r.suppUsed}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {r.drawingProvided} / {r.drawingUsed}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {r.graphProvided} / {r.graphUsed}
                  </td>
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
