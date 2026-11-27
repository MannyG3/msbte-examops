"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  UserX,
  Clock,
  BookOpen,
  FileCheck2,
  Send,
} from "lucide-react";

interface AllocItem {
  id: string;
  blockId: string;
  benchNo: number;
  candidatePaperId: string;
  seatNo: string;
  csm: string;
  subjectCode: string;
  isDetained: boolean;
  statusCode: string;
  mainBookSerial: string;
  supplementSerials: string;
}

export function ExamDayClient({
  day,
  slot,
  initialData,
}: {
  day: number;
  slot: "MORNING" | "AFTERNOON";
  initialData: {
    sessionName: string;
    sessionStatus: string;
    daySlots: Array<{ examDay: number; examDate: string; slot: string }>;
    blocks: Array<{ id: string; blockNo: number; roomNo: string }>;
    allocations: AllocItem[];
    submissions: Array<{ blockId: string; isSubmitted: boolean }>;
    copyCases: Array<{
      id: string;
      seatNo: string;
      csm: string;
      subjectCode: string;
      reportedTime: string;
      materialSeized: string;
      supervisorStatement: string;
    }>;
    earlyLeavings: Array<{ id: string; seatNo: string; csm: string; timeOut: string }>;
    answerBookRecords: Array<{
      blockId: string;
      mainProvided: number;
      mainUsed: number;
      suppProvided: number;
      suppUsed: number;
      drawingProvided: number;
      drawingUsed: number;
      graphProvided: number;
      graphUsed: number;
    }>;
    entries: Array<{
      id: string;
      csm: string;
      subjectCode: string;
      subjectName: string;
      candidateCount: number;
      receivedCount: number;
      usedCount: number;
      returnedCount: number;
      extraCount: number;
      lessCount: number;
    }>;
  };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ABSENT" | "COPY_CASE" | "EARLY" | "STATIONERY" | "QP">("ABSENT");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const activeBlocks = useMemo(() => {
    const map = new Map<string, AllocItem[]>();
    for (const a of initialData.allocations) {
      const list = map.get(a.blockId) ?? [];
      list.push(a);
      map.set(a.blockId, list);
    }
    return initialData.blocks
      .filter((b) => (map.get(b.id)?.length || 0) > 0)
      .map((b) => {
        const seats = map.get(b.id)!;
        const sub = initialData.submissions.find((s) => s.blockId === b.id);
        return {
          ...b,
          seats,
          isSubmitted: sub?.isSubmitted ?? false,
          absentCount: seats.filter((s) => s.statusCode === "AB").length,
          ccCount: seats.filter((s) => s.statusCode === "CC").length,
          detCount: seats.filter((s) => s.isDetained).length,
          presentCount: seats.filter((s) => !s.isDetained && s.statusCode !== "AB").length,
        };
      });
  }, [initialData]);

  const [selectedBlockId, setSelectedBlockId] = useState<string>(activeBlocks[0]?.id ?? "");
  const currentBlock = activeBlocks.find((b) => b.id === selectedBlockId) ?? activeBlocks[0];
  const allSubmitted = activeBlocks.length > 0 && activeBlocks.every((b) => b.isSubmitted);
  const isLocked = initialData.sessionStatus === "LOCKED";

  // Copy case form
  const [ccCandidatePaperId, setCcCandidatePaperId] = useState(initialData.allocations[0]?.candidatePaperId ?? "");
  const [ccTime, setCcTime] = useState("11:15 AM");
  const [ccMaterial, setCcMaterial] = useState("");
  const [ccStatement, setCcStatement] = useState("");

  // Early leaving form
  const [elSeatNo, setElSeatNo] = useState("");
  const [elCsm, setElCsm] = useState("");
  const [elTimeOut, setElTimeOut] = useState("12:30 PM");

  // Stationery form for selected block
  const existingAbRec = initialData.answerBookRecords.find((r) => r.blockId === currentBlock?.id);
  const [mainProv, setMainProv] = useState(existingAbRec?.mainProvided ?? currentBlock?.seats.length ?? 0);
  const [mainUsed, setMainUsed] = useState(existingAbRec?.mainUsed ?? currentBlock?.presentCount ?? 0);
  const [suppProv, setSuppProv] = useState(existingAbRec?.suppProvided ?? 20);
  const [suppUsed, setSuppUsed] = useState(existingAbRec?.suppUsed ?? 0);

  const callApi = async (payload: Record<string, unknown>, successText: string) => {
    let reason: string | undefined;
    if (isLocked && payload.action !== "UNLOCK_SESSION" && payload.action !== "LOCK_SESSION") {
      const r = window.prompt("Session is LOCKED. Enter reason for audit log:");
      if (!r) return;
      reason = r;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/exam-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      setMsg({ type: "ok", text: successText });
      router.refresh();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exam Day Console</h1>
          <p className="text-sm text-slate-600">
            Session: <strong>{initialData.sessionName}</strong> ·{" "}
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                isLocked ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {initialData.sessionStatus}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={`${day}:${slot}`}
            onChange={(e) => {
              const [d, s] = e.target.value.split(":");
              router.push(`/exam-day?day=${d}&slot=${s}`);
            }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            {initialData.daySlots.map((ds) => (
              <option key={`${ds.examDay}:${ds.slot}`} value={`${ds.examDay}:${ds.slot}`}>
                Day {ds.examDay} · {ds.examDate} · {ds.slot}
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              callApi(
                { action: isLocked ? "UNLOCK_SESSION" : "LOCK_SESSION" },
                isLocked ? "Session unlocked" : "Session locked after OIC sign-off"
              )
            }
            disabled={busy}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg ${
              isLocked
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-slate-900 text-white"
            }`}
          >
            {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {isLocked ? "Unlock Session" : "Lock Session"}
          </button>
        </div>
      </div>

      {/* Post-Absentee Unlock Banner */}
      {allSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            All {activeBlocks.length} blocks submitted! Post-absentee reports (Packing Slips, Attendance A, Format 7/8, QP Record) are unlocked.
          </div>
          <Link
            href={`/reports/packing-slips?day=${day}&slot=${slot}`}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg"
          >
            Open Packing Slips
          </Link>
        </div>
      )}

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

      {/* OIC Live Block Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Live Block Submission Grid ({activeBlocks.filter((b) => b.isSubmitted).length}/{activeBlocks.length} Submitted)
        </h2>
        {activeBlocks.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-sm text-slate-500">
            No bench allocations for Day {day} ({slot}). Generate bench arrangements first.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {activeBlocks.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBlockId(b.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currentBlock?.id === b.id
                    ? "border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50/40"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Block {b.blockNo}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      b.isSubmitted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {b.isSubmitted ? "Submitted" : "Pending"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Room {b.roomNo}</div>
                <div className="mt-2 flex items-center gap-2 text-[11px] font-medium">
                  <span className="text-emerald-700">P: {b.presentCount}</span>
                  <span className="text-red-700">AB: {b.absentCount}</span>
                  {b.ccCount > 0 && <span className="text-purple-700">CC: {b.ccCount}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex flex-wrap gap-6 text-sm font-medium">
        {[
          { key: "ABSENT", label: "Tap-to-Mark Absentees" },
          { key: "COPY_CASE", label: `Copy Cases (${initialData.copyCases.length})` },
          { key: "EARLY", label: `Early Leaving (${initialData.earlyLeavings.length})` },
          { key: "STATIONERY", label: "Answer Books & Stationery" },
          { key: "QP", label: "QP Packet Record" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Tap-to-Mark Absentees */}
      {activeTab === "ABSENT" && currentBlock && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Block {currentBlock.blockNo} ({currentBlock.roomNo}) — Tap Seat to Toggle Absent (AB)
              </h3>
              <p className="text-xs text-slate-500">
                Default is Present (green). Tap any seat number to mark Absent (red).
              </p>
            </div>
            <button
              onClick={() =>
                callApi(
                  {
                    action: "SUBMIT_BLOCK",
                    examDay: day,
                    slot,
                    blockId: currentBlock.id,
                    isSubmitted: !currentBlock.isSubmitted,
                  },
                  currentBlock.isSubmitted ? "Block reopened" : `Block ${currentBlock.blockNo} submitted!`
                )
              }
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Send className="w-3.5 h-3.5" />
              {currentBlock.isSubmitted ? "Reopen Block" : "Submit Block"}
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {currentBlock.seats.map((s) => {
              const isAb = s.statusCode === "AB";
              const isCc = s.statusCode === "CC";
              return (
                <button
                  key={s.id}
                  disabled={busy || s.isDetained}
                  onClick={() =>
                    callApi(
                      { action: "TOGGLE_ABSENT", candidatePaperId: s.candidatePaperId },
                      `Updated seat ${s.seatNo}`
                    )
                  }
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    s.isDetained
                      ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                      : isCc
                      ? "bg-purple-50 border-purple-400 text-purple-900"
                      : isAb
                      ? "bg-red-50 border-red-500 text-red-900 ring-1 ring-red-400"
                      : "bg-emerald-50/50 border-emerald-300 text-slate-900 hover:bg-emerald-100/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs">{s.seatNo}</span>
                    <span className="text-[10px] font-bold">
                      {s.isDetained ? "DET" : s.statusCode}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{s.csm}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Copy Cases */}
      {activeTab === "COPY_CASE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              callApi(
                {
                  action: "COPY_CASE",
                  candidatePaperId: ccCandidatePaperId,
                  reportedTime: ccTime,
                  materialSeized: ccMaterial,
                  supervisorStatement: ccStatement,
                },
                "Copy Case recorded and seat marked CC"
              );
            }}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-600" /> Record Copy Case (UFM)
            </h3>
            <select
              value={ccCandidatePaperId}
              onChange={(e) => setCcCandidatePaperId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            >
              {initialData.allocations.map((a) => (
                <option key={a.candidatePaperId} value={a.candidatePaperId}>
                  {a.seatNo} ({a.csm} · {a.subjectCode})
                </option>
              ))}
            </select>
            <input
              value={ccTime}
              onChange={(e) => setCcTime(e.target.value)}
              placeholder="Reported Time (e.g. 11:15 AM)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              required
            />
            <input
              value={ccMaterial}
              onChange={(e) => setCcMaterial(e.target.value)}
              placeholder="Material Seized (e.g. Handwritten chit)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              required
            />
            <textarea
              rows={3}
              value={ccStatement}
              onChange={(e) => setCcStatement(e.target.value)}
              placeholder="Supervisor Statement"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg"
            >
              Submit Copy Case
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Recorded Copy Cases</h3>
            {initialData.copyCases.length === 0 ? (
              <p className="text-xs text-slate-500">No copy cases reported for this session.</p>
            ) : (
              <div className="space-y-2">
                {initialData.copyCases.map((c) => (
                  <div key={c.id} className="p-3 border border-red-200 bg-red-50/40 rounded-lg text-xs">
                    <div className="font-bold">
                      Seat {c.seatNo} ({c.csm} · {c.subjectCode}) — {c.reportedTime}
                    </div>
                    <div className="text-slate-700 mt-1">Seized: {c.materialSeized}</div>
                    <div className="text-slate-600 mt-0.5">{c.supervisorStatement}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Early Leaving */}
      {activeTab === "EARLY" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              callApi(
                { action: "EARLY_LEAVING", examDay: day, slot, seatNo: elSeatNo, csm: elCsm, timeOut: elTimeOut },
                "Early leaving recorded"
              );
            }}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Record Early Leaving
            </h3>
            <input
              value={elSeatNo}
              onChange={(e) => setElSeatNo(e.target.value)}
              placeholder="Seat No (e.g. 1999001)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              required
            />
            <input
              value={elCsm}
              onChange={(e) => setElCsm(e.target.value)}
              placeholder="C-S-M (e.g. CO-3-K)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              required
            />
            <input
              value={elTimeOut}
              onChange={(e) => setElTimeOut(e.target.value)}
              placeholder="Time Out (e.g. 12:30 PM)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              required
            />
            <button type="submit" disabled={busy} className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg">
              Save Early Leaving
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900">Early Leaving Log</h3>
            {initialData.earlyLeavings.map((e) => (
              <div key={e.id} className="p-2.5 border border-slate-200 rounded-lg text-xs flex justify-between">
                <span className="font-mono font-semibold">{e.seatNo} ({e.csm})</span>
                <span className="text-slate-600">Out: {e.timeOut}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Answer Books & Stationery */}
      {activeTab === "STATIONERY" && currentBlock && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Block {currentBlock.blockNo} ({currentBlock.roomNo}) — Answer Book & Stationery Record
          </h3>
          <div className="text-xs text-slate-600">
            Block Present Candidates: <strong>{currentBlock.presentCount}</strong>{" "}
            {mainUsed !== currentBlock.presentCount && (
              <span className="text-amber-700 font-semibold ml-2">
                (Note: Main Books Used should equal Present count)
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1">Main Books Provided</label>
              <input
                type="number"
                value={mainProv}
                onChange={(e) => setMainProv(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Main Books Used</label>
              <input
                type="number"
                value={mainUsed}
                onChange={(e) => setMainUsed(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Supplements Provided</label>
              <input
                type="number"
                value={suppProv}
                onChange={(e) => setSuppProv(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Supplements Used</label>
              <input
                type="number"
                value={suppUsed}
                onChange={(e) => setSuppUsed(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={() =>
              callApi(
                {
                  action: "SAVE_ANSWER_BOOK_RECORD",
                  examDay: day,
                  slot,
                  blockId: currentBlock.id,
                  mainProvided: mainProv,
                  mainUsed,
                  suppProvided: suppProv,
                  suppUsed,
                },
                "Answer Book & Stationery record saved"
              )
            }
            disabled={busy}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
          >
            Save Stationery Record
          </button>
        </div>
      )}

      {/* Tab 5: QP Packet Record */}
      {activeTab === "QP" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Question Paper Packet Count (Per Paper)</h3>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-3 py-2">C-S-M</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Candidates</th>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">Used</th>
                <th className="px-3 py-2">Returned</th>
                <th className="px-3 py-2 text-right">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialData.entries.map((en) => (
                <QpRow key={en.id} entry={en} busy={busy} onSave={callApi} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QpRow({
  entry,
  busy,
  onSave,
}: {
  entry: {
    id: string;
    csm: string;
    subjectCode: string;
    subjectName: string;
    candidateCount: number;
    receivedCount: number;
    usedCount: number;
    returnedCount: number;
  };
  busy: boolean;
  onSave: (payload: Record<string, unknown>, msg: string) => void;
}) {
  const [rec, setRec] = useState(entry.receivedCount);
  const [used, setUsed] = useState(entry.usedCount);
  const [ret, setRet] = useState(entry.returnedCount);

  return (
    <tr>
      <td className="px-3 py-2 font-semibold">{entry.csm}</td>
      <td className="px-3 py-2">{entry.subjectCode} · {entry.subjectName}</td>
      <td className="px-3 py-2">{entry.candidateCount}</td>
      <td className="px-3 py-2">
        <input type="number" value={rec} onChange={(e) => setRec(Number(e.target.value))} className="w-16 px-2 py-1 border rounded" />
      </td>
      <td className="px-3 py-2">
        <input type="number" value={used} onChange={(e) => setUsed(Number(e.target.value))} className="w-16 px-2 py-1 border rounded" />
      </td>
      <td className="px-3 py-2">
        <input type="number" value={ret} onChange={(e) => setRet(Number(e.target.value))} className="w-16 px-2 py-1 border rounded" />
      </td>
      <td className="px-3 py-2 text-right">
        <button
          disabled={busy}
          onClick={() =>
            onSave(
              { action: "SAVE_QP_RECORD", timetableEntryId: entry.id, receivedCount: rec, usedCount: used, returnedCount: ret },
              `Saved QP record for ${entry.subjectCode}`
            )
          }
          className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold"
        >
          Save
        </button>
      </td>
    </tr>
  );
}
