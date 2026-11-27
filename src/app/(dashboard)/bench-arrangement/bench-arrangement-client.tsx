"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Printer, Grid, FileText, CheckCircle2 } from "lucide-react";

export function BenchArrangementClient({
  activeSession,
  entries,
  allocCounts,
}: {
  activeSession: any;
  entries: any[];
  allocCounts: any[];
}) {
  const router = useRouter();
  const [keepPaperInSingleBlock, setKeepPaperInSingleBlock] = useState(false);
  const [interleavePapers, setInterleavePapers] = useState(false);
  const [leaveEmptyBenches, setLeaveEmptyBenches] = useState(0);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  // Group entries by (examDay, slot)
  const slotMap = new Map<string, { examDay: number; examDate: string; slot: string; papers: any[]; totalCandidates: number }>();
  entries.forEach((e) => {
    const key = `${e.examDay}_${e.slot}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, {
        examDay: e.examDay,
        examDate: e.examDate,
        slot: e.slot,
        papers: [],
        totalCandidates: 0,
      });
    }
    const g = slotMap.get(key)!;
    g.papers.push(e);
    g.totalCandidates += e._count?.papers || 0;
  });

  const handleGenerate = async (examDay: number, slot: string) => {
    const key = `${examDay}_${slot}`;
    setLoadingKey(key);
    setLastResult(null);
    try {
      const res = await fetch("/api/allocators/bench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDay,
          slot,
          keepPaperInSingleBlock,
          leaveEmptyBenches,
          interleavePapers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to generate");
      } else {
        setLastResult({ examDay, slot, ...data });
        router.refresh();
      }
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Bench Arrangement Generator ({activeSession?.name || "No Session"})
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Serpentine bench numbering • Ordered by timetable → Inst Code → Seat No ascending
        </p>
      </div>

      {/* Options */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-6 text-xs">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
          <input
            type="checkbox"
            checked={keepPaperInSingleBlock}
            onChange={(e) => setKeepPaperInSingleBlock(e.target.checked)}
            className="rounded text-blue-600"
          />
          Keep paper in single block (when it fits)
        </label>

        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
          <input
            type="checkbox"
            checked={interleavePapers}
            onChange={(e) => setInterleavePapers(e.target.checked)}
            className="rounded text-blue-600"
          />
          Interleave papers within block
        </label>

        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">Leave empty benches / block:</span>
          <input
            type="number"
            min={0}
            max={10}
            value={leaveEmptyBenches}
            onChange={(e) => setLeaveEmptyBenches(Number(e.target.value))}
            className="w-16 px-2 py-1 border border-slate-300 rounded font-mono"
          />
        </div>
      </div>

      {lastResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>
              <strong>Day {lastResult.examDay} ({lastResult.slot}) v{lastResult.version}:</strong>{" "}
              Allocated <strong>{lastResult.stats.allocatedCount}</strong> candidates across{" "}
              <strong>{lastResult.stats.blocksUsed}</strong> blocks ({lastResult.changedCount} moved vs prior version).
            </span>
          </div>
          {lastResult.unallocatedCount > 0 && (
            <span className="text-rose-700 font-bold">
              Unallocated: {lastResult.unallocatedCount}
            </span>
          )}
        </div>
      )}

      {/* Day & Slot List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Exam Day & Date</th>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">Papers (C-S-M)</th>
                <th className="py-3 px-4 text-center">Candidates</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from(slotMap.values()).map((g) => {
                const key = `${g.examDay}_${g.slot}`;
                const alloc = allocCounts.find((a) => a.examDay === g.examDay && a.slot === g.slot);
                const allocatedCount = alloc?._count?.id || 0;
                const version = alloc?._max?.version || 0;
                const dateFormatted = new Date(g.examDate).toLocaleDateString("en-GB").replace(/\//g, "-");

                return (
                  <tr key={key} className="hover:bg-slate-50">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">Day {g.examDay}</div>
                      <div className="text-[11px] font-mono text-slate-500">{dateFormatted}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          g.slot === "MORNING"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                        }`}
                      >
                        {g.slot === "MORNING" ? "Morning" : "Afternoon"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {g.papers.map((p) => (
                          <span
                            key={p.id}
                            className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                          >
                            {p.csm} ({p.subject.code})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {g.totalCandidates}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {allocatedCount > 0 ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px]">
                          v{version} ({allocatedCount} seated)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                      <button
                        disabled={loadingKey === key}
                        onClick={() => handleGenerate(g.examDay, g.slot)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold"
                      >
                        <Sparkles className="w-3 h-3" />
                        {loadingKey === key ? "..." : allocatedCount > 0 ? "Regenerate" : "Generate"}
                      </button>

                      {allocatedCount > 0 && (
                        <>
                          <Link
                            href={`/bench-arrangement/${g.examDay}-${g.slot}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-semibold"
                          >
                            <Grid className="w-3 h-3 text-blue-600" /> Edit Grid
                          </Link>
                          <Link
                            href={`/reports/bench-arrangement?day=${g.examDay}&slot=${g.slot}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-semibold"
                          >
                            <Printer className="w-3 h-3" /> Bulk A4 PDF
                          </Link>
                          <Link
                            href={`/reports/gate-chart?day=${g.examDay}&slot=${g.slot}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                          >
                            <FileText className="w-3 h-3" /> Gate Chart
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
