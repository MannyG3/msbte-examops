import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/shared/print-button";

export default async function BenchArrangementReportPage(props: {
  searchParams?: Promise<{ day?: string; slot?: string }>;
}) {
  const sp = await props.searchParams;
  const examDay = parseInt(sp?.day || "1", 10);
  const slot = (sp?.slot || "MORNING").toUpperCase() as "MORNING" | "AFTERNOON";

  const session = await requireTenantAuth();

  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const [institute, activeSession] = await Promise.all([
      tx.institute.findUnique({ where: { id: session.instituteId } }),
      tx.examSession.findFirst({
        where: { instituteId: session.instituteId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!activeSession) return { institute, activeSession: null, blocks: [], allocations: [] };

    const [blocks, allocations] = await Promise.all([
      tx.block.findMany({
        where: { instituteId: session.instituteId },
        include: { room: true },
        orderBy: { blockNo: "asc" },
      }),
      tx.blockAllocation.findMany({
        where: { sessionId: activeSession.id, examDay, slot },
        include: {
          candidatePaper: {
            include: {
              candidate: true,
              timetableEntry: { include: { subject: true } },
            },
          },
        },
        orderBy: [{ blockId: "asc" }, { benchNo: "asc" }],
      }),
    ]);

    return { institute, activeSession, blocks, allocations };
  });

  type AllocItem = (typeof data.allocations)[number];
  const allocsByBlock = new Map<string, AllocItem[]>();
  for (const a of data.allocations) {
    const list = allocsByBlock.get(a.blockId);
    if (list) {
      list.push(a);
    } else {
      allocsByBlock.set(a.blockId, [a]);
    }
  }

  const activeBlocks = data.blocks.filter((b) => (allocsByBlock.get(b.id)?.length || 0) > 0);

  const firstEntry = data.allocations[0]?.candidatePaper?.timetableEntry;
  const formattedDate = firstEntry
    ? new Date(firstEntry.examDate).toLocaleDateString("en-GB").replace(/\//g, "-")
    : "—";

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Link href="/bench-arrangement" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Bench Arrangement
        </Link>
        <PrintButton label={`Print All ${activeBlocks.length} Blocks (A4 Portrait)`} />
      </div>

      {activeBlocks.map((block) => {
        const blockAllocs = allocsByBlock.get(block.id) || [];
        const cols = Array.from({ length: block.columns }, (_, i) => i + 1);
        const rows = Array.from({ length: block.columnBreak }, (_, i) => i + 1);

        // Unique Inst Code + Paper combinations in this block
        const courseLineSet = new Map<string, string>();
        blockAllocs.forEach((a) => {
          const instCode = a.candidatePaper.candidate.instCode;
          const te = a.candidatePaper.timetableEntry;
          const sub = te.subject;
          const key = `${instCode}_${te.csm}_${sub.code}`;
          if (!courseLineSet.has(key)) {
            courseLineSet.set(
              key,
              `Inst Code - ${instCode} : ${te.csm}- ${sub.name} (${sub.abbreviation})(${sub.code})- [ ${te.timeRange} ] ,`
            );
          }
        });

        return (
          <div
            key={block.id}
            className="bg-white p-6 border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-2 break-after-page text-black font-serif"
          >
            {/* Exact MSBTE Header */}
            <div className="text-center mb-2">
              <div className="text-sm font-bold tracking-wide uppercase">
                MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
              </div>
              <div className="text-sm font-bold underline uppercase mt-0.5">
                BENCH ARRANGEMENT
              </div>
            </div>

            {/* Info Box */}
            <table className="w-full text-[11px] border border-black border-collapse mb-0">
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-1.5 border-r border-black w-[60%] align-top leading-snug">
                    <div>
                      <strong>Examination:</strong> {data.activeSession?.name}
                    </div>
                    <div>
                      <strong>Date:</strong> {formattedDate}
                    </div>
                    <div>
                      <strong>Exam Center:</strong> {data.institute?.name}
                    </div>
                  </td>
                  <td className="p-1.5 w-[40%] align-top leading-snug">
                    <div>
                      <strong>Block NO:</strong> {block.blockNo}
                    </div>
                    <div>
                      <strong>Block / Room No -</strong> {block.room.roomNo}
                    </div>
                    <div>
                      <strong>Session:</strong> {slot === "MORNING" ? "Morning" : "Afternoon"}
                    </div>
                    <div>
                      <strong>Day:</strong> {examDay}
                    </div>
                    <div>
                      <strong>Exam Center Code:</strong> {data.institute?.examCentreCode || data.institute?.code}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="p-1.5 leading-snug">
                    <div className="font-bold">Courses &amp; Subjects:</div>
                    {Array.from(courseLineSet.values()).map((line, idx) => (
                      <div key={idx} className="text-[10.5px]">
                        {line}
                      </div>
                    ))}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Serpentine Bench Grid */}
            <table className="w-full text-[10px] border border-black border-t-0 border-collapse mt-0">
              <thead>
                <tr className="border-b border-black bg-slate-50">
                  {cols.map((c) => (
                    <th key={c} colSpan={3} className="p-1 border-r border-black text-center font-bold">
                      Column No-{String(c).padStart(2, "0")}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-black font-bold">
                  {cols.map((c) => (
                    <SubCols key={c} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r} className="border-b border-black">
                    {cols.map((c) => {
                      const cell = blockAllocs.find((a) => a.columnNo === c && a.rowNo === r);
                      const isDet =
                        cell?.candidatePaper?.isDetained || cell?.candidatePaper?.candidate?.isDetained;
                      // Compute benchNo even if empty
                      const benchNo =
                        block.numberingStyle === "SERPENTINE" && c % 2 === 0
                          ? c * block.columnBreak - (r - 1)
                          : (c - 1) * block.columnBreak + r;

                      return (
                        <CellTriplet
                          key={c}
                          benchNo={benchNo}
                          seatNo={cell ? `${cell.candidatePaper.candidate.seatNo}${isDet ? " (DET)" : ""}` : ""}
                          csm={cell ? cell.candidatePaper.timetableEntry.csm : ""}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer Signature */}
            <div className="mt-10 flex justify-between items-end text-[11px]">
              <div className="text-[10px] text-slate-600">
                *(DET) = Detained — Do not issue answer book
              </div>
              <div className="text-center">
                <div className="w-44 border-t border-black pt-1 font-bold">
                  Sign. of Officer-Incharge
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {activeBlocks.length === 0 && (
        <div className="p-8 bg-white rounded-xl border text-center text-xs text-slate-500">
          No bench allocations found for Day {examDay} ({slot}). Generate bench arrangements first.
        </div>
      )}
    </div>
  );
}

function SubCols() {
  return (
    <>
      <th className="p-0.5 border-r border-black text-center">Bench</th>
      <th className="p-0.5 border-r border-black text-center">Seat_No</th>
      <th className="p-0.5 border-r border-black text-center">Course_</th>
    </>
  );
}

function CellTriplet({ benchNo, seatNo, csm }: { benchNo: number; seatNo: string; csm: string }) {
  return (
    <>
      <td className="p-1 border-r border-black text-center font-mono">{benchNo}</td>
      <td className="p-1 border-r border-black text-center font-mono font-bold">{seatNo}</td>
      <td className="p-1 border-r border-black text-center font-mono">{csm}</td>
    </>
  );
}
