import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPostExamSlotData } from "@/lib/reports/post-exam-data";
import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function PackingSlipsPage({
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
        title={`Packing Slips & Attendance Report "A" — Day ${day} (${slot})`}
        exportUrl={`/api/reports/export?type=packing-slips&day=${day}&slot=${slot}`}
      />

      {data.entries.map((entry) => {
        const absentSeats: string[] = [];
        const ccSeats: string[] = [];
        const detSeats: string[] = [];
        let present = 0;

        for (const p of entry.papers) {
          const st = p.statuses.find((s) => s.section === 1) ?? p.statuses[0];
          const isDet = p.isDetained || p.candidate.isDetained;
          if (isDet) detSeats.push(p.candidate.seatNo);
          else if (st?.specialCode.code === "AB") absentSeats.push(p.candidate.seatNo);
          else if (st?.specialCode.code === "CC") {
            ccSeats.push(p.candidate.seatNo);
            present++;
          } else {
            present++;
          }
        }

        return (
          <div
            key={entry.id}
            className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none break-after-page text-black"
          >
            <div className="text-center border-b-2 border-black pb-2 mb-3">
              <div className="text-xs font-bold uppercase">
                MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
              </div>
              <div className="text-sm font-extrabold uppercase mt-0.5">
                PACKING SLIP & ATTENDANCE REPORT &quot;A&quot;
              </div>
              <div className="text-xs font-semibold">
                Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} (
                {data.activeSession?.name})
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div><strong>Date:</strong> {dateStr}</div>
              <div><strong>Session:</strong> {slot} ({entry.timeRange})</div>
              <div><strong>Course / Sem / Scheme:</strong> {entry.csm}</div>
              <div><strong>Subject:</strong> {entry.subject.code} — {entry.subject.name}</div>
            </div>

            <table className="w-full border-collapse border border-black text-xs mb-4">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black px-2 py-1.5">Total Allotted</th>
                  <th className="border border-black px-2 py-1.5">Present (Answer Books Packed)</th>
                  <th className="border border-black px-2 py-1.5">Absent</th>
                  <th className="border border-black px-2 py-1.5">Detained</th>
                  <th className="border border-black px-2 py-1.5">Copy Case (UFM)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-center font-bold">
                  <td className="border border-black px-2 py-2">{entry.papers.length}</td>
                  <td className="border border-black px-2 py-2">{present}</td>
                  <td className="border border-black px-2 py-2">{absentSeats.length}</td>
                  <td className="border border-black px-2 py-2">{detSeats.length}</td>
                  <td className="border border-black px-2 py-2">{ccSeats.length}</td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs space-y-2 border border-black p-3">
              <div><strong>Absent Seat Nos:</strong> {absentSeats.length ? absentSeats.join(", ") : "NIL"}</div>
              <div><strong>Detained Seat Nos:</strong> {detSeats.length ? detSeats.join(", ") : "NIL"}</div>
              <div><strong>Copy Case Seat Nos:</strong> {ccSeats.length ? ccSeats.join(", ") : "NIL"}</div>
            </div>

            <div className="mt-12 flex justify-between text-xs font-semibold">
              <div>Prepared By (Exam Cell)</div>
              <div>Officer In-Charge (Exam)</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
