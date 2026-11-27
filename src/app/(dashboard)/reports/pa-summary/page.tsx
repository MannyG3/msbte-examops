import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPostExamSlotData } from "@/lib/reports/post-exam-data";
import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function PaSummaryReportPage({
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
      <PrintToolbar
        title={`Present / Absent Count Summary — Day ${day} (${slot})`}
        exportUrl={`/api/reports/export?type=pa-summary&day=${day}&slot=${slot}`}
      />

      <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <div className="text-sm font-extrabold uppercase mt-0.5">
            PRESENT / ABSENT COUNT SUMMARY (PER C-S-M)
          </div>
          <div className="text-xs">
            Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} | Date: {dateStr} | {slot}
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1.5">C-S-M</th>
              <th className="border border-black px-2 py-1.5">Subject</th>
              <th className="border border-black px-2 py-1.5 text-center">Allotted</th>
              <th className="border border-black px-2 py-1.5 text-center">Present</th>
              <th className="border border-black px-2 py-1.5 text-center">Absent</th>
              <th className="border border-black px-2 py-1.5 text-center">Detained</th>
              <th className="border border-black px-2 py-1.5 text-center">Copy Case</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => {
              let present = 0;
              let ab = 0;
              let det = 0;
              let cc = 0;
              for (const p of e.papers) {
                const st = p.statuses.find((s) => s.section === 1) ?? p.statuses[0];
                if (p.isDetained || p.candidate.isDetained) det++;
                else if (st?.specialCode.code === "AB") ab++;
                else if (st?.specialCode.code === "CC") {
                  cc++;
                  present++;
                } else present++;
              }
              return (
                <tr key={e.id}>
                  <td className="border border-black px-2 py-1.5 font-semibold">{e.csm}</td>
                  <td className="border border-black px-2 py-1.5">{e.subject.code} — {e.subject.name}</td>
                  <td className="border border-black px-2 py-1.5 text-center">{e.papers.length}</td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">{present}</td>
                  <td className="border border-black px-2 py-1.5 text-center">{ab}</td>
                  <td className="border border-black px-2 py-1.5 text-center">{det}</td>
                  <td className="border border-black px-2 py-1.5 text-center">{cc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
