"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Upload, Award, AlertTriangle } from "lucide-react";

export function ResultsClient({
  initialRecords,
}: {
  initialRecords: Array<{
    id: string;
    seatNo: string;
    csm: string;
    subjectCode: string;
    marks: number;
    maxMarks: number;
    status: string;
  }>;
}) {
  const router = useRouter();
  const [pasteText, setPasteText] = useState("1999001\tCO-3-K\t313303\t86\t100\tPASS\n1999002\tCO-3-K\t313303\t32\t100\tFAIL");
  const [busy, setBusy] = useState(false);

  const summaryByCsm = useMemo(() => {
    const map = new Map<string, { total: number; pass: number }>();
    for (const r of initialRecords) {
      const cur = map.get(r.csm) ?? { total: 0, pass: 0 };
      cur.total++;
      if (r.status === "PASS") cur.pass++;
      map.set(r.csm, cur);
    }
    return Array.from(map.entries()).map(([csm, s]) => ({
      csm,
      ...s,
      passPct: s.total ? ((s.pass / s.total) * 100).toFixed(1) : "0.0",
    }));
  }, [initialRecords]);

  const hotspots = useMemo(() => {
    const map = new Map<string, { total: number; fail: number }>();
    for (const r of initialRecords) {
      const cur = map.get(r.subjectCode) ?? { total: 0, fail: 0 };
      cur.total++;
      if (r.status !== "PASS") cur.fail++;
      map.set(r.subjectCode, cur);
    }
    return Array.from(map.entries())
      .map(([subjectCode, s]) => ({ subjectCode, ...s, failPct: ((s.fail / s.total) * 100).toFixed(1) }))
      .sort((a, b) => b.fail - a.fail);
  }, [initialRecords]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const rows = pasteText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const [seatNo, csm, subjectCode, marks, maxMarks, status] = line.split(/[\t,]+/).map((s) => s.trim());
          return { seatNo, csm, subjectCode, marks: Number(marks), maxMarks: Number(maxMarks || 100), status };
        });

      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">MSBTE Results Analysis</h1>
        <p className="text-sm text-slate-600">Pass % by C-S-M, Toppers, and Subject Failure Hotspots</p>
      </div>

      <form onSubmit={handleImport} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="text-xs font-medium text-slate-600">Paste Result Rows (`SeatNo, C-S-M, SubjectCode, Marks, MaxMarks, PASS/FAIL`)</div>
        <textarea rows={3} value={pasteText} onChange={(e) => setPasteText(e.target.value)} className="w-full px-3 py-2 text-xs font-mono border rounded-lg" />
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg">
          <Upload className="w-3.5 h-3.5" /> Import Results
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" /> Pass % by Programme / C-S-M
          </h2>
          {summaryByCsm.map((s) => (
            <div key={s.csm} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="font-semibold">{s.csm}</span>
              <span>{s.pass}/{s.total} passed (<strong>{s.passPct}%</strong>)</span>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600" /> Failure Hotspots (By Subject)
          </h2>
          {hotspots.map((h) => (
            <div key={h.subjectCode} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="font-mono font-semibold">{h.subjectCode}</span>
              <span className="text-red-700">{h.fail}/{h.total} failed ({h.failPct}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
