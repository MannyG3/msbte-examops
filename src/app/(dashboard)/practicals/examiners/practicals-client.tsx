"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Printer, Trash2, AlertTriangle, CheckCircle2, Calendar, Users } from "lucide-react";

export function PracticalsClient({
  initialData,
}: {
  initialData: {
    sessionName: string;
    examiners: Array<{
      id: string;
      name: string;
      designation: string;
      instituteName: string;
      subjectCode: string;
      type: string;
      phone: string;
    }>;
    slots: Array<{
      id: string;
      csm: string;
      subjectCode: string;
      batchName: string;
      labName: string;
      examDate: string;
      timeSlot: string;
      internalName: string;
      externalName: string;
    }>;
  };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"SLOTS" | "EXAMINERS">("SLOTS");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Examiner form
  const [exName, setExName] = useState("");
  const [exDesig, setExDesig] = useState("Lecturer");
  const [exInst, setExInst] = useState("Govt. Polytechnic");
  const [exSub, setExSub] = useState("313303");
  const [exType, setExType] = useState("EXTERNAL");
  const [exPhone, setExPhone] = useState("");

  // Slot form
  const [csm, setCsm] = useState("CO-3-K");
  const [subjectCode, setSubjectCode] = useState("313303");
  const [batchName, setBatchName] = useState("CO3K-B1");
  const [labName, setLabName] = useState("Lab-101");
  const [examDate, setExamDate] = useState("2026-11-02");
  const [timeSlot, setTimeSlot] = useState("10:00 AM - 12:00 PM");
  const [internalId, setInternalId] = useState("");
  const [externalId, setExternalId] = useState("");

  const callApi = async (payload: Record<string, unknown>, okMsg: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/practicals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setMsg({ type: "ok", text: okMsg });
      router.refresh();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Practicals & Examiner Directory</h1>
        <p className="text-sm text-slate-600">
          Session: <strong>{initialData.sessionName}</strong> · Clash-free batch timetable & appointment letters
        </p>
      </div>

      {msg && (
        <div
          className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
            msg.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="border-b border-slate-200 flex gap-6 text-sm font-medium">
        <button
          onClick={() => setTab("SLOTS")}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 ${
            tab === "SLOTS" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"
          }`}
        >
          <Calendar className="w-4 h-4" /> Batch-Wise Timetable ({initialData.slots.length})
        </button>
        <button
          onClick={() => setTab("EXAMINERS")}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 ${
            tab === "EXAMINERS" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"
          }`}
        >
          <Users className="w-4 h-4" /> Examiner Directory ({initialData.examiners.length})
        </button>
      </div>

      {tab === "SLOTS" && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              callApi(
                {
                  action: "ADD_SLOT",
                  csm,
                  subjectCode,
                  batchName,
                  labName,
                  examDate,
                  timeSlot,
                  internalExaminerId: internalId || null,
                  externalExaminerId: externalId || null,
                },
                "Practical slot scheduled (0 clashes)"
              );
            }}
            className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">C-S-M</label>
              <input value={csm} onChange={(e) => setCsm(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject Code</label>
              <input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Batch</label>
              <input value={batchName} onChange={(e) => setBatchName(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Lab</label>
              <input value={labName} onChange={(e) => setLabName(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Time Slot</label>
              <input value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Internal Examiner</label>
              <select value={internalId} onChange={(e) => setInternalId(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg">
                <option value="">Optional...</option>
                {initialData.examiners.filter((e) => e.type === "INTERNAL").map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">External Examiner</label>
              <select value={externalId} onChange={(e) => setExternalId(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg">
                <option value="">Optional...</option>
                {initialData.examiners.filter((e) => e.type === "EXTERNAL").map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Schedule Practical Batch
              </button>
            </div>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">C-S-M / Sub</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Lab</th>
                  <th className="px-4 py-3">Internal</th>
                  <th className="px-4 py-3">External</th>
                  <th className="px-4 py-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialData.slots.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 font-medium">{s.examDate}</td>
                    <td className="px-4 py-2.5">{s.timeSlot}</td>
                    <td className="px-4 py-2.5">{s.csm} · {s.subjectCode}</td>
                    <td className="px-4 py-2.5 font-semibold">{s.batchName}</td>
                    <td className="px-4 py-2.5">{s.labName}</td>
                    <td className="px-4 py-2.5">{s.internalName}</td>
                    <td className="px-4 py-2.5">{s.externalName}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => callApi({ action: "DELETE_SLOT", slotId: s.id }, "Slot removed")}
                        className="text-red-600 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "EXAMINERS" && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              callApi(
                {
                  action: "ADD_EXAMINER",
                  name: exName,
                  designation: exDesig,
                  instituteName: exInst,
                  subjectCode: exSub,
                  type: exType,
                  phone: exPhone,
                },
                "Examiner added to directory"
              );
              setExName("");
            }}
            className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
          >
            <input value={exName} onChange={(e) => setExName(e.target.value)} placeholder="Examiner Name" className="px-3 py-2 text-xs border rounded-lg" required />
            <input value={exDesig} onChange={(e) => setExDesig(e.target.value)} placeholder="Designation" className="px-3 py-2 text-xs border rounded-lg" />
            <input value={exInst} onChange={(e) => setExInst(e.target.value)} placeholder="Institute Name" className="px-3 py-2 text-xs border rounded-lg" />
            <input value={exSub} onChange={(e) => setExSub(e.target.value)} placeholder="Subject Code" className="px-3 py-2 text-xs border rounded-lg" required />
            <select value={exType} onChange={(e) => setExType(e.target.value)} className="px-3 py-2 text-xs border rounded-lg">
              <option value="EXTERNAL">EXTERNAL</option>
              <option value="INTERNAL">INTERNAL</option>
            </select>
            <button type="submit" disabled={busy} className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg">
              Add Examiner
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Institute</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3 text-right">Appointment Letter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialData.examiners.map((ex) => (
                  <tr key={ex.id}>
                    <td className="px-4 py-2.5 font-semibold">{ex.name} ({ex.designation})</td>
                    <td className="px-4 py-2.5">{ex.type}</td>
                    <td className="px-4 py-2.5">{ex.instituteName}</td>
                    <td className="px-4 py-2.5 font-mono">{ex.subjectCode}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/practicals/examiners/${ex.id}/letter`}
                        className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Letter
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
