"use client";

import { useState, useEffect } from "react";
import { FileCheck2, Download, Save, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ReceiptsPage() {
  const [day, setDay] = useState(1);
  const [controllerName, setControllerName] = useState("");
  const [morningOpenTime, setMorningOpenTime] = useState("09:10 AM");
  const [afternoonOpenTime, setAfternoonOpenTime] = useState("01:40 PM");
  const [receiptTime, setReceiptTime] = useState("08:15 AM");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/receipts?day=${day}`)
      .then((r) => r.json())
      .then((d) => {
        setControllerName(d.receipt?.controllerName || d.lastController || "");
        if (d.receipt?.morningOpenTime) setMorningOpenTime(d.receipt.morningOpenTime);
        if (d.receipt?.afternoonOpenTime) setAfternoonOpenTime(d.receipt.afternoonOpenTime);
        if (d.receipt?.receiptTime) setReceiptTime(d.receipt.receiptTime);
      })
      .catch(() => {});
  }, [day]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, examDay: day, controllerName, morningOpenTime, afternoonOpenTime, receiptTime }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setMsg({ type: "ok", text: `Saved Day ${day} DC Controller & Receipt Times` });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Day-Level QP Receipts (DC 0710)</h1>
        <p className="text-sm text-slate-600">
          Set the Distribution Centre Controller name & times per exam day, then download Format 3A, Annexure G & Format 02 (.docx)
        </p>
      </div>

      {msg && (
        <div className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${msg.type === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Exam Day (1–18)</label>
            <input type="number" min={1} max={30} value={day} onChange={(e) => setDay(Number(e.target.value))} className="w-full px-3 py-2 text-sm border rounded-lg" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Controller of Examination Name (DC)</label>
            <input value={controllerName} onChange={(e) => setControllerName(e.target.value)} placeholder="e.g. Mane S. S. / Mrs.Dasgude S.G." className="w-full px-3 py-2 text-sm border rounded-lg" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Morning QP Opening Time (Format 3A)</label>
            <input value={morningOpenTime} onChange={(e) => setMorningOpenTime(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Afternoon QP Opening Time (Format 3A)</label>
            <input value={afternoonOpenTime} onChange={(e) => setAfternoonOpenTime(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Receipt Time from DC (Annexure G)</label>
            <input value={receiptTime} onChange={(e) => setReceiptTime(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" />
          </div>
        </div>
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg">
          <Save className="w-3.5 h-3.5" /> Save Day {day} Receipt Settings
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: "FORMAT_3A", title: "Format No. 3A (ANNEXTURE - H)", desc: "Receipt of Question Paper Packets (M + A)" },
          { key: "ANNEXURE_G", title: "ANNEXURE - G / FORMAT NO -03", desc: "Receipt from Controller of Examination (0710)" },
          { key: "FORMAT_02", title: "FORMAT NO -02", desc: "Controller Receipt from DC (0710)" },
        ].map((f) => (
          <div key={f.key} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FileCheck2 className="w-4 h-4 text-indigo-600 shrink-0" />
              {f.title}
            </div>
            <p className="text-xs text-slate-500">{f.desc}</p>
            <a
              href={`/api/reports/docx?key=${f.key}&day=${day}&slot=MORNING&output=docx`}
              className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Download className="w-3.5 h-3.5" /> Download .docx
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
