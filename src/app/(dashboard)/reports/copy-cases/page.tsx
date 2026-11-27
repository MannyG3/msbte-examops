import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPostExamSlotData } from "@/lib/reports/post-exam-data";
import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function CopyCasesReportPage({
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
      <PrintToolbar title={`Copy Case (UFM) Report — Day ${day} (${slot})`} />

      <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <div className="text-sm font-extrabold uppercase mt-0.5">COPY CASE (UFM) REPORT</div>
          <div className="text-xs">
            Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} | Date: {dateStr} | {slot}
          </div>
        </div>

        {data.copyCases.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No copy cases reported for Day {day} ({slot}).
          </div>
        ) : (
          <div className="space-y-4">
            {data.copyCases.map((c, idx) => (
              <div key={c.id} className="border border-black p-4 text-xs space-y-2">
                <div className="font-bold">
                  Case #{idx + 1} — Seat No: {c.candidatePaper.candidate.seatNo} | C-S-M:{" "}
                  {c.candidatePaper.timetableEntry.csm} | Subject: {c.candidatePaper.timetableEntry.subject.code} (
                  {c.candidatePaper.timetableEntry.subject.name})
                </div>
                <div><strong>Time Reported:</strong> {c.reportedTime}</div>
                <div><strong>Material Seized:</strong> {c.materialSeized}</div>
                <div><strong>Supervisor Statement:</strong> {c.supervisorStatement}</div>
                <div className="pt-8 flex justify-between font-semibold">
                  <div>Sign. of Candidate</div>
                  <div>Sign. of Supervisor</div>
                  <div>Sign. of Officer In-Charge</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
