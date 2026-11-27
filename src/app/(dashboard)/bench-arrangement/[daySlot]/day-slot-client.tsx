"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Unlock, Printer, GripVertical } from "lucide-react";

export function DaySlotClient({
  sessionId,
  examDay,
  slot,
  blocks,
  allocations,
}: {
  sessionId: string;
  examDay: number;
  slot: string;
  blocks: any[];
  allocations: any[];
}) {
  const router = useRouter();
  const [draggedAllocId, setDraggedAllocId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allocsByBlock = new Map<string, any[]>();
  allocations.forEach((a) => {
    if (!allocsByBlock.has(a.blockId)) allocsByBlock.set(a.blockId, []);
    allocsByBlock.get(a.blockId)!.push(a);
  });

  const toggleBlockLock = async (blockId: string, currentlyLocked: boolean) => {
    setBusy(true);
    try {
      await fetch("/api/allocators/bench", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_LOCK",
          sessionId,
          examDay,
          slot,
          blockId,
          isLocked: !currentlyLocked,
        }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const moveCandidateToBlock = async (allocationId: string, targetBlockId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/allocators/bench", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MOVE_CANDIDATE",
          allocationId,
          targetBlockId,
        }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Move failed");
      else router.refresh();
    } finally {
      setDraggedAllocId(null);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/bench-arrangement" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Bench Arrangement
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            Interactive Block Grid — Day {examDay} ({slot})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Drag any candidate onto another block to reassign, or lock blocks before regenerating
          </p>
        </div>

        <Link
          href={`/reports/bench-arrangement?day=${examDay}&slot=${slot}`}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm"
        >
          <Printer className="w-4 h-4" /> Bulk Print A4 Sheets
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {blocks.map((block) => {
          const blockAllocs = allocsByBlock.get(block.id) || [];
          const isLocked = blockAllocs.some((a) => a.isLocked);
          const cols = Array.from({ length: block.columns }, (_, i) => i + 1);
          const rows = Array.from({ length: block.columnBreak }, (_, i) => i + 1);

          return (
            <div
              key={block.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedAllocId && !isLocked) {
                  moveCandidateToBlock(draggedAllocId, block.id);
                }
              }}
              className={`bg-white rounded-xl border p-4 shadow-sm space-y-3 transition ${
                draggedAllocId && !isLocked ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <span className="font-bold text-sm text-slate-900">
                    Block NO: {block.blockNo}
                  </span>
                  <span className="ml-2 text-xs font-mono text-slate-500">
                    Room {block.room?.roomNo} ({blockAllocs.length}/{block.strength})
                  </span>
                </div>

                {blockAllocs.length > 0 && (
                  <button
                    disabled={busy}
                    onClick={() => toggleBlockLock(block.id, isLocked)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border ${
                      isLocked
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {isLocked ? "Locked" : "Lock Block"}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10px] border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      {cols.map((c) => (
                        <th key={c} colSpan={3} className="p-1 border-r border-slate-300 text-center font-bold">
                          Col {String(c).padStart(2, "0")}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-300 text-slate-500">
                      {cols.map((c) => (
                        <FragmentHeader key={c} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r} className="border-b border-slate-200">
                        {cols.map((c) => {
                          const cell = blockAllocs.find((a) => a.columnNo === c && a.rowNo === r);
                          const isDet = cell?.candidatePaper?.isDetained || cell?.candidatePaper?.candidate?.isDetained;
                          return (
                            <td
                              key={c}
                              colSpan={3}
                              draggable={Boolean(cell && !isLocked)}
                              onDragStart={() => cell && setDraggedAllocId(cell.id)}
                              className={`p-1 border-r border-slate-200 font-mono ${
                                cell && !isLocked ? "cursor-grab hover:bg-blue-50" : ""
                              } ${isDet ? "bg-rose-50 text-rose-800" : ""}`}
                            >
                              {cell ? (
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-slate-400 w-4">{cell.benchNo}</span>
                                  <span className="font-bold text-slate-900">
                                    {cell.candidatePaper.candidate.seatNo}
                                    {isDet && "*"}
                                  </span>
                                  <span className="text-blue-700">{cell.candidatePaper.timetableEntry.csm}</span>
                                </div>
                              ) : (
                                <div className="text-center text-slate-300">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FragmentHeader() {
  return (
    <>
      <th className="p-0.5 text-center border-r border-slate-200">B</th>
      <th className="p-0.5 text-center border-r border-slate-200">Seat</th>
      <th className="p-0.5 text-center border-r border-slate-300">C-S-M</th>
    </>
  );
}
