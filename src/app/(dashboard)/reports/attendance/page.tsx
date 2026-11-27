import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPreExamSlotData, formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function AttendanceReportPage({
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
    if (d.role === "JUNIOR" && d.blockId) {
      supByBlock.set(d.blockId, d.staff.name);
    }
  }

  const activeBlocks = data.blocks.filter((b) => (allocsByBlock.get(b.id)?.length || 0) > 0);
  const firstEntry = data.entries[0];
  const dateStr = formatMsbteDate(firstEntry?.examDate);

  // Build pages: per block, and if any subject in that block hasSections, emit Section I & Section II separately
  const pages: Array<{
    key: string;
    blockNo: number;
    roomNo: string;
    supervisor: string;
    sectionLabel: string | null;
    rows: AllocItem[];
  }> = [];

  for (const blk of activeBlocks) {
    const rows = allocsByBlock.get(blk.id) ?? [];
    const hasSectioned = rows.some((r) => r.candidatePaper.timetableEntry.subject.hasSections);
    const supervisor = supByBlock.get(blk.id) ?? "________________";
    if (hasSectioned) {
      pages.push({
        key: `${blk.id}-S1`,
        blockNo: blk.blockNo,
        roomNo: blk.room.roomNo,
        supervisor,
        sectionLabel: "SECTION - I",
        rows,
      });
      pages.push({
        key: `${blk.id}-S2`,
        blockNo: blk.blockNo,
        roomNo: blk.room.roomNo,
        supervisor,
        sectionLabel: "SECTION - II",
        rows,
      });
    } else {
      pages.push({
        key: blk.id,
        blockNo: blk.blockNo,
        roomNo: blk.room.roomNo,
        supervisor,
        sectionLabel: null,
        rows,
      });
    }
  }

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar
        title={`Attendance Report — Day ${day} (${slot})`}
        subtitle={`${pages.length} printable block pages`}
        exportUrl={`/api/reports/export?type=attendance&day=${day}&slot=${slot}`}
      />

      {pages.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
          No bench allocations found for Day {day} ({slot}). Generate bench arrangements first.
        </div>
      ) : (
        pages.map((p) => {
          const papersSummary = Array.from(
            new Set(
              p.rows.map(
                (r) =>
                  `${r.candidatePaper.timetableEntry.csm} (${r.candidatePaper.timetableEntry.subject.code} - ${r.candidatePaper.timetableEntry.subject.abbreviation})`
              )
            )
          ).join(", ");

          return (
            <div
              key={p.key}
              className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none break-after-page text-black"
            >
              <div className="text-center border-b-2 border-black pb-2 mb-3">
                <div className="text-[11px] font-bold uppercase tracking-wide">
                  MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
                </div>
                <div className="text-sm font-extrabold uppercase mt-0.5">
                  ATTENDANCE REPORT {p.sectionLabel ? `(${p.sectionLabel})` : ""}
                </div>
                <div className="text-xs font-semibold">
                  Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} ({data.activeSession?.name})
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div><strong>Date:</strong> {dateStr}</div>
                <div><strong>Session:</strong> {slot}</div>
                <div><strong>Block / Room:</strong> Block {p.blockNo} ({p.roomNo})</div>
              </div>
              <div className="text-xs mb-2">
                <strong>Course / Subject:</strong> {papersSummary}
              </div>
              <div className="text-xs mb-3">
                <strong>Junior Supervisor:</strong> {p.supervisor}
              </div>

              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1 w-10 text-center">Sr.</th>
                    <th className="border border-black px-2 py-1 w-24">Seat No</th>
                    <th className="border border-black px-2 py-1 w-20">C-S-M</th>
                    <th className="border border-black px-2 py-1">Main Answer Book Serial No.</th>
                    <th className="border border-black px-2 py-1">Supplement Serial Nos.</th>
                    <th className="border border-black px-2 py-1 w-28">Candidate Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {p.rows.map((r, idx) => {
                    const isDet = r.candidatePaper.isDetained || r.candidatePaper.candidate.isDetained;
                    return (
                      <tr key={r.id}>
                        <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                        <td className="border border-black px-2 py-1 font-mono font-semibold">
                          {r.candidatePaper.candidate.seatNo} {isDet ? "(DET)" : ""}
                        </td>
                        <td className="border border-black px-2 py-1">{r.candidatePaper.timetableEntry.csm}</td>
                        <td className="border border-black px-2 py-1">{isDet ? "DETAINED" : ""}</td>
                        <td className="border border-black px-2 py-1"></td>
                        <td className="border border-black px-2 py-1"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 grid grid-cols-3 gap-4 text-xs border border-black p-2">
                <div><strong>Total Allotted:</strong> {p.rows.length}</div>
                <div><strong>Total Present:</strong> ________</div>
                <div><strong>Total Absent / Det:</strong> ________</div>
              </div>

              <div className="mt-10 flex justify-between text-xs font-semibold">
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
