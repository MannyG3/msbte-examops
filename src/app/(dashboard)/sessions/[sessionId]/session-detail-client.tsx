"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, Circle, Clock } from "lucide-react";

export function SessionDetailClient({ examSession }: { examSession: any }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const items = examSession.checklistItems || [];
  const completedCount = items.filter((i: any) => i.isCompleted).length;
  const pct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const getDaysDiff = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const now = new Date("2026-11-27").getTime();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diff > 0) return `In ${diff} days`;
    if (diff === 0) return "Today";
    return `${Math.abs(diff)} days ago`;
  };

  const toggleItem = async (itemId: string, currentVal: boolean) => {
    setLoadingId(itemId);
    try {
      await fetch("/api/sessions/checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, isCompleted: !currentVal }),
      });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sessions"
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sessions
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded border border-blue-200">
            {examSession.code}
          </span>
          <h1 className="text-xl font-bold text-slate-900">{examSession.name}</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Academic Year {examSession.academicYear} • Phase timeline, countdowns & readiness checklist
        </p>
      </div>

      {/* Phase Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-blue-700 uppercase">Practicals (Sem 3/5)</div>
          <div className="text-xs font-semibold text-slate-900 mt-1">
            {new Date(examSession.practicalStartDate).toLocaleDateString()} –{" "}
            {new Date(examSession.practicalEndDate).toLocaleDateString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {getDaysDiff(examSession.practicalStartDate)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-700 uppercase">Sem 1 Practicals</div>
          <div className="text-xs font-semibold text-slate-900 mt-1">
            {examSession.sem1PracticalStartDate
              ? `${new Date(examSession.sem1PracticalStartDate).toLocaleDateString()} – ${new Date(
                  examSession.sem1PracticalEndDate
                ).toLocaleDateString()}`
              : "Same Window"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {examSession.sem1PracticalStartDate ? getDaysDiff(examSession.sem1PracticalStartDate) : "—"}
          </div>
        </div>

        <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-xs">
          <div className="text-[11px] font-bold text-blue-800 uppercase">Theory Exam Window</div>
          <div className="text-xs font-bold text-slate-900 mt-1">
            {new Date(examSession.theoryStartDate).toLocaleDateString()} –{" "}
            {new Date(examSession.theoryEndDate).toLocaleDateString()}
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">
            {examSession._count.theoryPapers} papers scheduled
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase">Expected Result</div>
          <div className="text-xs font-semibold text-slate-900 mt-1">
            {examSession.expectedResultDate
              ? new Date(examSession.expectedResultDate).toLocaleDateString()
              : "TBD"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {examSession.expectedResultDate ? getDaysDiff(examSession.expectedResultDate) : "—"}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Exam Cell Readiness Checklist</h2>
            <p className="text-xs text-slate-500">Click any item to toggle completion status</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            {completedCount} / {items.length} Completed ({pct}%)
          </span>
        </div>

        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="divide-y divide-slate-100">
          {items.map((item: any) => (
            <div
              key={item.id}
              onClick={() => !loadingId && toggleItem(item.id, item.isCompleted)}
              className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition"
            >
              <div className="flex items-center gap-3">
                {item.isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                )}
                <div>
                  <div
                    className={`text-xs font-semibold ${
                      item.isCompleted ? "line-through text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Phase: {item.phase} • Owner: {item.ownerName || "Coordinator"}
                  </div>
                </div>
              </div>

              <div className="text-xs font-mono text-slate-500">
                Due: {new Date(item.dueDate).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
