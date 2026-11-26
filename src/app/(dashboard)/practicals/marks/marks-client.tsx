"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";

export function PracticalMarksClient({
  activeSession,
  initialSlotId,
}: {
  activeSession: any;
  initialSlotId?: string;
}) {
  const router = useRouter();
  const slots = activeSession?.practicalSlots || [];
  const [selectedSlotId, setSelectedSlotId] = useState(initialSlotId || slots[0]?.id || "");
  const [loading, setLoading] = useState(false);

  const currentSlot = slots.find((s: any) => s.id === selectedSlotId);
  const faPrHead = currentSlot?.course?.assessmentHeads?.find((h: any) => h.headType === "FA_PR");
  const saPrHead = currentSlot?.course?.assessmentHeads?.find((h: any) => h.headType === "SA_PR");

  // Initialize marks state
  const [marksState, setMarksState] = useState<Record<string, { fa: string; sa: string }>>(() => {
    const init: Record<string, { fa: string; sa: string }> = {};
    slots.forEach((sl: any) => {
      const faH = sl.course?.assessmentHeads?.find((h: any) => h.headType === "FA_PR");
      const saH = sl.course?.assessmentHeads?.find((h: any) => h.headType === "SA_PR");
      sl.batch?.students?.forEach((st: any) => {
        const faM = faH ? st.marks?.find((m: any) => m.assessmentHeadId === faH.id) : null;
        const saM = saH ? st.marks?.find((m: any) => m.assessmentHeadId === saH.id) : null;
        init[`${sl.id}_${st.id}`] = {
          fa: faM ? String(faM.marksObtained) : "",
          sa: saM ? String(saM.marksObtained) : "",
        };
      });
    });
    return init;
  });

  const updateMark = (studentId: string, field: "fa" | "sa", val: string) => {
    const key = `${selectedSlotId}_${studentId}`;
    setMarksState((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { fa: "", sa: "" }), [field]: val },
    }));
  };

  const handleSave = async (lockSlot: boolean) => {
    if (!currentSlot) return;
    setLoading(true);

    const entries: any[] = [];
    currentSlot.batch.students.forEach((st: any) => {
      const val = marksState[`${selectedSlotId}_${st.id}`] || { fa: "", sa: "" };
      if (faPrHead && val.fa !== "") {
        entries.push({
          studentId: st.id,
          assessmentHeadId: faPrHead.id,
          headType: "FA_PR",
          marksObtained: parseFloat(val.fa),
          minMarks: faPrHead.minMarks,
          courseCode: currentSlot.course.code,
          status: "PRESENT",
        });
      }
      if (saPrHead && val.sa !== "") {
        entries.push({
          studentId: st.id,
          assessmentHeadId: saPrHead.id,
          headType: "SA_PR",
          marksObtained: parseFloat(val.sa),
          minMarks: saPrHead.minMarks,
          courseCode: currentSlot.course.code,
          status: "PRESENT",
        });
      }
    });

    try {
      const res = await fetch("/api/practicals/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: currentSlot.id,
          sessionId: activeSession.id,
          entries,
          lockSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save");
      } else {
        alert(
          `Saved ${entries.length} mark entries.${
            data.detainedCount > 0 ? ` ${data.detainedCount} student(s) flagged DETAINED due to FA-PR rule.` : ""
          }`
        );
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/practicals/planner"
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Practical Planner
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            Practical Marks Entry (FA-PR & SA-PR)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enforces MSBTE detention rule: scoring below FA-PR minimum detains student in semester
          </p>
        </div>

        {currentSlot && !currentSlot.isLocked && (
          <div className="flex items-center gap-2">
            <button
              disabled={loading}
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5 text-blue-600" /> Save Draft
            </button>
            <button
              disabled={loading}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" /> External Sign-Off & Lock
            </button>
          </div>
        )}
      </div>

      {/* Slot Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select Practical Batch
          </label>
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
          >
            {slots.length === 0 && <option value="">No practical slots scheduled</option>}
            {slots.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.course.code} - {s.course.title} | Batch {s.division.name}-{s.batch.name} (
                {new Date(s.examDate).toLocaleDateString()}) {s.isLocked ? "[LOCKED]" : ""}
              </option>
            ))}
          </select>
        </div>

        {currentSlot && (
          <div className="flex items-center gap-3 text-xs">
            {faPrHead && (
              <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded border border-blue-200 font-semibold">
                FA-PR: Max {faPrHead.maxMarks} / Min {faPrHead.minMarks}
              </span>
            )}
            {saPrHead && (
              <span className="bg-purple-50 text-purple-800 px-2.5 py-1 rounded border border-purple-200 font-semibold">
                SA-PR: Max {saPrHead.maxMarks} / Min {saPrHead.minMarks}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Marks Grid */}
      {currentSlot && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-4">Roll No</th>
                <th className="py-2.5 px-4">Seat No</th>
                <th className="py-2.5 px-4">Student Name</th>
                {faPrHead && <th className="py-2.5 px-4 w-32">FA-PR (/{faPrHead.maxMarks})</th>}
                {saPrHead && <th className="py-2.5 px-4 w-32">SA-PR (/{saPrHead.maxMarks})</th>}
                <th className="py-2.5 px-4">Eligibility Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentSlot.batch.students.map((st: any) => {
                const val = marksState[`${selectedSlotId}_${st.id}`] || { fa: "", sa: "" };
                const faNum = parseFloat(val.fa);
                const isFaDetained = faPrHead && val.fa !== "" && faNum < faPrHead.minMarks;

                return (
                  <tr key={st.id} className={isFaDetained ? "bg-rose-50/50" : "hover:bg-slate-50"}>
                    <td className="py-2 px-4 font-mono font-bold text-slate-800">{st.rollNo}</td>
                    <td className="py-2 px-4 font-mono text-blue-700 font-semibold">
                      {st.seatNo || "—"}
                    </td>
                    <td className="py-2 px-4 font-medium text-slate-900">{st.name}</td>
                    {faPrHead && (
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          min={0}
                          max={faPrHead.maxMarks}
                          disabled={currentSlot.isLocked}
                          value={val.fa}
                          onChange={(e) => updateMark(st.id, "fa", e.target.value)}
                          className={`w-20 px-2 py-1 border rounded font-mono text-xs ${
                            isFaDetained ? "border-rose-400 bg-rose-50 text-rose-900" : "border-slate-300"
                          }`}
                        />
                      </td>
                    )}
                    {saPrHead && (
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          min={0}
                          max={saPrHead.maxMarks}
                          disabled={currentSlot.isLocked}
                          value={val.sa}
                          onChange={(e) => updateMark(st.id, "sa", e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                        />
                      </td>
                    )}
                    <td className="py-2 px-4">
                      {isFaDetained || st.status === "DETAINED" ? (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded font-bold text-[10px]">
                          <AlertTriangle className="w-3 h-3" /> DETAINED (FA-PR)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> ELIGIBLE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
