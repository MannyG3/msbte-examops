"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FlaskConical,
  Sparkles,
  Calendar,
  CheckCircle2,
  Printer,
  Users,
  FileSpreadsheet,
} from "lucide-react";

export function PlannerClient({ activeSession }: { activeSession: any }) {
  const router = useRouter();
  const [holidaysInput, setHolidaysInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const slots = activeSession?.practicalSlots || [];

  const handleGenerate = async () => {
    setLoading(true);
    setStats(null);
    const holidays = holidaysInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/practicals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holidays }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to generate practical timetable");
        setLoading(false);
        return;
      }
      setStats(data.result?.stats);
      router.refresh();
    } catch {
      alert("Error generating practical schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Practical / Oral Timetable Planner
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Clash-free batch practical schedule respecting Sem 1 vs Sem 3/5 windows, lab capacity, and Sundays
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/practicals/examiners"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
          >
            External Examiners
          </Link>
          <Link
            href="/practicals/marks"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
          >
            Marks Entry & Detention
          </Link>
        </div>
      </div>

      {/* Generator Control */}
      <div className="print:hidden bg-white rounded-xl border border-slate-200 p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-1">MSBTE Practical Windows</div>
          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div>
              <strong>Sem 3/5:</strong>{" "}
              {activeSession
                ? `${new Date(activeSession.practicalStartDate).toLocaleDateString()} – ${new Date(
                    activeSession.practicalEndDate
                  ).toLocaleDateString()}`
                : "Not set"}
            </div>
            <div>
              <strong>Sem 1:</strong>{" "}
              {activeSession?.sem1PracticalStartDate
                ? `${new Date(activeSession.sem1PracticalStartDate).toLocaleDateString()} – ${new Date(
                    activeSession.sem1PracticalEndDate
                  ).toLocaleDateString()}`
                : "Same window"}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Additional Holidays to Skip (YYYY-MM-DD, comma-separated)
          </label>
          <input
            type="text"
            placeholder="e.g. 2026-10-25, 2026-11-04"
            value={holidaysInput}
            onChange={(e) => setHolidaysInput(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
          />
        </div>

        <button
          disabled={loading}
          onClick={handleGenerate}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-xs shadow-sm transition"
        >
          <Sparkles className="w-4 h-4 text-blue-200" />
          {loading ? "Scheduling..." : slots.length > 0 ? "Regenerate Timetable" : "Auto-Generate Timetable"}
        </button>
      </div>

      {stats && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>
              <strong>Scheduled {stats.scheduledCount} / {stats.totalTasks} batch practicals</strong>{" "}
              (Sundays skipped: {stats.sundaysSkipped})
            </span>
          </div>
        </div>
      )}

      {/* Practical Slots Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Department Practical Schedule ({slots.length} Batch Slots)
          </span>
          {slots.length > 0 && (
            <button
              onClick={() => window.print()}
              className="print:hidden inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-semibold"
            >
              <Printer className="w-3.5 h-3.5" /> Print Timetable PDF
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Sem / Batch</th>
                <th className="py-2.5 px-4">Course</th>
                <th className="py-2.5 px-4">Lab</th>
                <th className="py-2.5 px-4">Internal Examiner</th>
                <th className="py-2.5 px-4">External / Mode</th>
                <th className="py-2.5 px-4 print:hidden text-right">Sheets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slots.map((s: any) => {
                const isExt = s.course.assessmentHeads?.some(
                  (h: any) => h.headType === "SA_PR" && h.tag === "EXTERNAL"
                );
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {new Date(s.examDate).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {s.startTime} – {s.endTime}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800">Sem {s.course.semester}</span> •{" "}
                      <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                        {s.division.name}-{s.batch.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-bold text-blue-700 mr-1.5">
                        {s.course.code}
                      </span>
                      <span className="font-medium text-slate-900">{s.course.title}</span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{s.room.name}</td>
                    <td className="py-2.5 px-4 text-slate-700">{s.internalExaminer.name}</td>
                    <td className="py-2.5 px-4">
                      {isExt ? (
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {s.externalExaminer ? s.externalExaminer.name : "# External (Unassigned)"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">@ Internal</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 print:hidden text-right">
                      <Link
                        href={`/practicals/marks?slotId=${s.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Marks / Sheet
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {slots.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No practical schedule generated yet. Click "Auto-Generate Timetable" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
