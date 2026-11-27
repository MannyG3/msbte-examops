"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Printer, AlertTriangle, CheckCircle2 } from "lucide-react";

export function ClassTestsClient({
  initialMarks,
}: {
  initialMarks: Array<{
    id: string;
    csm: string;
    subjectCode: string;
    seatNo: string;
    ct1Marks: number | null;
    ct2Marks: number | null;
    ct1Absent: boolean;
    ct2Absent: boolean;
    faThAvg: number;
    attendancePct: number;
    isDetained: boolean;
  }>;
}) {
  const router = useRouter();
  const [csm, setCsm] = useState("CO-3-K");
  const [subjectCode, setSubjectCode] = useState("313303");
  const [pasteText, setPasteText] = useState("1999001\t24\t26\t88\n1999002\tAB\tAB\t65");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const rows = pasteText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const [seatNo, ct1Raw, ct2Raw, attRaw] = line.split(/[\t,]+/).map((s) => s.trim());
          const ct1Absent = ct1Raw?.toUpperCase() === "AB";
          const ct2Absent = ct2Raw?.toUpperCase() === "AB";
          return {
            seatNo,
            ct1Absent,
            ct2Absent,
            ct1Marks: ct1Absent ? 0 : Number(ct1Raw || 0),
            ct2Marks: ct2Absent ? 0 : Number(ct2Raw || 0),
            attendancePct: Number(attRaw ?? 100),
          };
        });

      const res = await fetch("/api/class-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csm, subjectCode, rows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setMsg(`Saved ${json.savedCount} CT1/CT2 & FA-TH records`);
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const defaulters = initialMarks.filter((m) => m.isDetained);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Class Tests (CT1 / CT2) & Eligibility</h1>
          <p className="text-sm text-slate-600">
            Paste from Excel (`SeatNo, CT1, CT2, Attendance%`) · Auto FA-TH average & Principal Detained List
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg"
        >
          <Printer className="w-3.5 h-3.5" /> Print Detained List
        </button>
      </div>

      <form onSubmit={handleSave} className="print:hidden bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <input value={csm} onChange={(e) => setCsm(e.target.value)} placeholder="C-S-M" className="px-3 py-2 text-xs border rounded-lg" />
          <input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="Subject Code" className="px-3 py-2 text-xs border rounded-lg" />
        </div>
        <textarea
          rows={4}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          className="w-full px-3 py-2 text-xs font-mono border rounded-lg"
          placeholder="Paste rows: SeatNo<TAB>CT1(or AB)<TAB>CT2(or AB)<TAB>Attendance%"
        />
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg">
          <Upload className="w-3.5 h-3.5" /> Compute FA-TH & Save
        </button>
        {msg && <div className="text-xs font-medium text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />{msg}</div>}
      </form>

      {defaulters.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs space-y-2">
          <div className="font-bold text-red-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Attendance Defaulters / Detained List (&lt;75% Attendance) — {defaulters.length} Students
          </div>
          <div className="flex flex-wrap gap-2">
            {defaulters.map((d) => (
              <span key={d.id} className="px-2 py-1 bg-white border border-red-200 rounded font-mono">
                {d.seatNo} ({d.subjectCode}: {d.attendancePct}%)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5">Seat No</th>
              <th className="px-4 py-2.5">C-S-M</th>
              <th className="px-4 py-2.5">Subject</th>
              <th className="px-4 py-2.5 text-center">CT1 (30)</th>
              <th className="px-4 py-2.5 text-center">CT2 (30)</th>
              <th className="px-4 py-2.5 text-center">FA-TH Avg</th>
              <th className="px-4 py-2.5 text-center">Attendance %</th>
              <th className="px-4 py-2.5">Eligibility</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialMarks.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2 font-mono font-semibold">{m.seatNo}</td>
                <td className="px-4 py-2">{m.csm}</td>
                <td className="px-4 py-2">{m.subjectCode}</td>
                <td className="px-4 py-2 text-center">{m.ct1Absent ? "AB" : m.ct1Marks}</td>
                <td className="px-4 py-2 text-center">{m.ct2Absent ? "AB" : m.ct2Marks}</td>
                <td className="px-4 py-2 text-center font-bold">{m.faThAvg}</td>
                <td className="px-4 py-2 text-center">{m.attendancePct}%</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${m.isDetained ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {m.isDetained ? "DETAINED" : "ELIGIBLE"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
