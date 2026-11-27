import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPostExamSlotData } from "@/lib/reports/post-exam-data";
import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function SeatStatusReportPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; slot?: string }>;
}) {
  const sp = await searchParams;
  const day = Number(sp.day || "1");
  const slot = (sp.slot || "MORNING") as "MORNING" | "AFTERNOON";
  const data = await getPostExamSlotData(day, slot);
  const dateStr = formatMsbteDate(data.entries[0]?.examDate);

  const rows = data.entries.flatMap((e) =>
    e.papers.map((p) => {
      const st = p.statuses.find((s) => s.section === 1) ?? p.statuses[0];
      const isDet = p.isDetained || p.candidate.isDetained;
      const status = isDet ? "DETAINED" : st?.specialCode.label ?? "Present";
      return {
        seatNo: p.candidate.seatNo,
        csm: e.csm,
        subjectCode: e.subject.code,
        status,
      };
    })
  );

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar
        title={`Seat Number Status Report — Day ${day} (${slot})`}
        exportUrl={`/api/reports/export?type=seat-status&day=${day}&slot=${slot}`}
      />

      <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <div className="text-sm font-extrabold uppercase mt-0.5">SEAT NUMBER STATUS REPORT</div>
          <div className="text-xs">
            Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} | Date: {dateStr} | {slot}
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1">Sr.</th>
              <th className="border border-black px-2 py-1">Seat No</th>
              <th className="border border-black px-2 py-1">C-S-M</th>
              <th className="border border-black px-2 py-1">Subject Code</th>
              <th className="border border-black px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.seatNo}-${r.subjectCode}`}>
                <td className="border border-black px-2 py-1 text-center">{i + 1}</td>
                <td className="border border-black px-2 py-1 font-mono font-semibold">{r.seatNo}</td>
                <td className="border border-black px-2 py-1">{r.csm}</td>
                <td className="border border-black px-2 py-1">{r.subjectCode}</td>
                <td className="border border-black px-2 py-1 font-semibold">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
