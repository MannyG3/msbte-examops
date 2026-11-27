import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPreExamSlotData, formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function BlankAbsentReportPage({
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

  const activeBlocks = data.blocks.filter((b) => (allocsByBlock.get(b.id)?.length || 0) > 0);
  const dateStr = formatMsbteDate(data.entries[0]?.examDate);

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar title={`Blank Present / Absent Report — Day ${day} (${slot})`} />

      {activeBlocks.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
          No bench allocations found for Day {day} ({slot}).
        </div>
      ) : (
        activeBlocks.map((blk) => {
          const rows = allocsByBlock.get(blk.id) ?? [];
          return (
            <div
              key={blk.id}
              className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none break-after-page text-black"
            >
              <div className="text-center border-b-2 border-black pb-2 mb-3">
                <div className="text-xs font-bold uppercase">
                  MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
                </div>
                <div className="text-sm font-extrabold uppercase">
                  BLANK PRESENT / ABSENT SHEET (HAND-MARKING)
                </div>
                <div className="text-xs">
                  {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} | Date: {dateStr} | {slot} | Block{" "}
                  {blk.blockNo} ({blk.room.roomNo})
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {rows.map((r) => {
                  const isDet = r.candidatePaper.isDetained || r.candidatePaper.candidate.isDetained;
                  return (
                    <div
                      key={r.id}
                      className="border border-black px-2 py-1.5 flex items-center justify-between"
                    >
                      <span className="font-mono font-semibold">
                        {r.candidatePaper.candidate.seatNo}
                        {isDet ? " (DET)" : ""}
                      </span>
                      <span className="text-[10px] text-slate-600">P / A</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-between text-xs font-semibold">
                <div>Absent Seat Nos: ______________________________</div>
                <div>Sign. of Supervisor</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
