import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/shared/print-button";

export default async function GateChartPage(props: {
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

    if (!activeSession) return { institute, activeSession: null, allocations: [] };

    const allocations = await tx.blockAllocation.findMany({
      where: { sessionId: activeSession.id, examDay, slot },
      include: {
        block: { include: { room: true } },
        candidatePaper: {
          include: {
            candidate: true,
            timetableEntry: { include: { subject: true } },
          },
        },
      },
      orderBy: [{ block: { blockNo: "asc" } }, { benchNo: "asc" }],
    });

    return { institute, activeSession, allocations };
  });

  // Group by paper (csm + subjectCode) -> block ranges
  const paperMap = new Map<
    string,
    {
      csm: string;
      subjectCode: string;
      subjectName: string;
      timeRange: string;
      blocks: Map<number, { blockNo: number; roomNo: string; seats: string[] }>;
    }
  >();

  data.allocations.forEach((a) => {
    const te = a.candidatePaper.timetableEntry;
    const key = `${te.csm}_${te.subject.code}`;
    if (!paperMap.has(key)) {
      paperMap.set(key, {
        csm: te.csm,
        subjectCode: te.subject.code,
        subjectName: te.subject.name,
        timeRange: te.timeRange,
        blocks: new Map(),
      });
    }
    const p = paperMap.get(key)!;
    if (!p.blocks.has(a.block.blockNo)) {
      p.blocks.set(a.block.blockNo, {
        blockNo: a.block.blockNo,
        roomNo: a.block.room.roomNo,
        seats: [],
      });
    }
    p.blocks.get(a.block.blockNo)!.seats.push(a.candidatePaper.candidate.seatNo);
  });

  const firstEntry = data.allocations[0]?.candidatePaper?.timetableEntry;
  const formattedDate = firstEntry
    ? new Date(firstEntry.examDate).toLocaleDateString("en-GB").replace(/\//g, "-")
    : "—";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Link href="/bench-arrangement" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Bench Arrangement
        </Link>
        <PrintButton label="Print Gate Chart (Notice Board)" />
      </div>

      <div className="bg-white p-8 border border-slate-300 shadow-sm print:border-none print:shadow-none text-black">
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <h1 className="text-lg font-black uppercase mt-1">
            {data.institute?.name} (EC: {data.institute?.examCentreCode || data.institute?.code})
          </h1>
          <div className="text-sm font-bold underline mt-0.5">
            GATE CHART / NOTICE BOARD DISPLAY — {data.activeSession?.name}
          </div>
          <div className="text-xs font-semibold mt-1">
            Day: {examDay} | Date: {formattedDate} | Session: {slot === "MORNING" ? "Morning" : "Afternoon"}
          </div>
        </div>

        <div className="space-y-6">
          {Array.from(paperMap.values()).map((p) => (
            <div key={`${p.csm}_${p.subjectCode}`} className="border border-black">
              <div className="bg-slate-100 p-2.5 border-b border-black flex justify-between items-center text-sm font-bold">
                <span>
                  {p.csm} — {p.subjectName} ({p.subjectCode})
                </span>
                <span className="text-xs font-mono">[ {p.timeRange} ]</span>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black bg-slate-50 text-xs uppercase">
                    <th className="p-2 border-r border-black text-center w-24">Block NO</th>
                    <th className="p-2 border-r border-black text-center w-28">Room No</th>
                    <th className="p-2 border-r border-black text-center">Seat Numbers (From – To)</th>
                    <th className="p-2 text-center w-20">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(p.blocks.values()).map((b) => {
                    const sorted = [...b.seats].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
                    return (
                      <tr key={b.blockNo} className="border-b border-slate-300">
                        <td className="p-2 border-r border-black text-center font-bold text-base">
                          {b.blockNo}
                        </td>
                        <td className="p-2 border-r border-black text-center font-mono font-bold text-base">
                          {b.roomNo}
                        </td>
                        <td className="p-2 border-r border-black text-center font-mono font-bold text-lg">
                          {sorted[0]} – {sorted[sorted.length - 1]}
                        </td>
                        <td className="p-2 text-center font-bold">{sorted.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
