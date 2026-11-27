import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPreExamSlotData, formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function SupervisorReportPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; slot?: string }>;
}) {
  const sp = await searchParams;
  const day = Number(sp.day || "1");
  const slot = (sp.slot || "MORNING") as "MORNING" | "AFTERNOON";
  const data = await getPreExamSlotData(day, slot);

  type AllocItem = (typeof data.allocations)[number];
  const allocsByBlock = new Map<string, AllocItem[]>();
  for (const a of data.allocations) {
    const list = allocsByBlock.get(a.blockId) ?? [];
    list.push(a);
    allocsByBlock.set(a.blockId, list);
  }

  const supByBlock = new Map<string, string>();
  for (const d of data.duties) {
    if (d.role === "JUNIOR" && d.blockId) supByBlock.set(d.blockId, d.staff.name);
  }

  const activeBlocks = data.blocks.filter((b) => (allocsByBlock.get(b.id)?.length || 0) > 0);
  const dateStr = formatMsbteDate(data.entries[0]?.examDate);

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar
        title={`Supervisor Report — Day ${day} (${slot})`}
        subtitle={`${activeBlocks.length} blocks`}
      />

      {activeBlocks.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
          No bench allocations found for Day {day} ({slot}).
        </div>
      ) : (
        activeBlocks.map((blk) => {
          const rows = allocsByBlock.get(blk.id) ?? [];
          const detainedCount = rows.filter(
            (r) => r.candidatePaper.isDetained || r.candidatePaper.candidate.isDetained
          ).length;
          const supervisor = supByBlock.get(blk.id) ?? "________________";

          return (
            <div
              key={blk.id}
              className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none break-after-page text-black"
            >
              <div className="text-center border-b-2 border-black pb-2 mb-4">
                <div className="text-[11px] font-bold uppercase">
                  MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
                </div>
                <div className="text-sm font-extrabold uppercase mt-0.5">
                  SUPERVISOR&apos;S DAILY REPORT (PRE-EXAM / BLOCK SUMMARY)
                </div>
                <div className="text-xs font-semibold">
                  Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} ({data.activeSession?.name})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div><strong>Date:</strong> {dateStr}</div>
                <div><strong>Session:</strong> {slot}</div>
                <div><strong>Exam Block No:</strong> Block {blk.blockNo} (Room {blk.room.roomNo})</div>
                <div><strong>Junior Supervisor:</strong> {supervisor}</div>
              </div>

              <table className="w-full border-collapse border border-black text-xs mb-5">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-3 py-2 text-left">Particulars</th>
                    <th className="border border-black px-3 py-2 w-32 text-center">Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black px-3 py-2">1. Candidates Allotted to Block (excl. Detained: {detainedCount})</td>
                    <td className="border border-black px-3 py-2 text-center font-bold">{rows.length}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-3 py-2">2. Candidates Present</td>
                    <td className="border border-black px-3 py-2"></td>
                  </tr>
                  <tr>
                    <td className="border border-black px-3 py-2">3. Candidates Absent (Seat Nos: _______________________)</td>
                    <td className="border border-black px-3 py-2"></td>
                  </tr>
                  <tr>
                    <td className="border border-black px-3 py-2">4. Main Answer Books Issued / Used / Returned</td>
                    <td className="border border-black px-3 py-2 text-center">___ / ___ / ___</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-3 py-2">5. Supplements Issued / Used / Returned</td>
                    <td className="border border-black px-3 py-2 text-center">___ / ___ / ___</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-3 py-2">6. Question Papers Received / Used / Returned</td>
                    <td className="border border-black px-3 py-2 text-center">___ / ___ / ___</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-3 py-2">7. Copy Cases Reported (if any)</td>
                    <td className="border border-black px-3 py-2"></td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-12 flex justify-between text-xs font-semibold">
                <div>Sign. of Junior Supervisor</div>
                <div>Sign. of Officer In-Charge</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
