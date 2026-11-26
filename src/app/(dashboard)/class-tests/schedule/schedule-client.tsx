"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Plus, ArrowLeft, AlertCircle } from "lucide-react";

export function ScheduleClient({
  classTests,
  courses,
  divisions,
}: {
  classTests: any[];
  courses: any[];
  divisions: any[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    courseId: courses[0]?.id || "",
    divisionId: divisions[0]?.id || "",
    testNumber: "1",
    testDate: "2026-09-21",
    startTime: "10:30 AM",
    endTime: "11:30 AM",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/class-tests/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to schedule");
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/class-tests/marks"
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go to Class Test Marks Grid
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Class Test (CT1 & CT2) Timetable</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule internal class tests (30 marks each) per course and division with clash detection
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
            Scheduled Class Tests ({classTests.length})
          </div>
          <div className="divide-y divide-slate-100">
            {classTests.map((ct) => (
              <div key={ct.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      CT{ct.testNumber}
                    </span>
                    <span className="font-mono font-bold text-slate-800">{ct.course.code}</span>
                    <span className="font-bold text-slate-900">{ct.course.title}</span>
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Sem {ct.division.semester} Div {ct.division.name} •{" "}
                    {new Date(ct.testDate).toLocaleDateString("en-IN")} ({ct.startTime} – {ct.endTime})
                  </div>
                </div>
                <Link
                  href={`/class-tests/marks?courseId=${ct.courseId}&divisionId=${ct.divisionId}`}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Enter Marks →
                </Link>
              </div>
            ))}
            {classTests.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No class tests scheduled yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Schedule Class Test
          </h2>

          {error && (
            <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Course</label>
              <select
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Sem {c.semester} | {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Division</label>
                <select
                  value={form.divisionId}
                  onChange={(e) => setForm({ ...form, divisionId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      Sem {d.semester} - Div {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Test</label>
                <select
                  value={form.testNumber}
                  onChange={(e) => setForm({ ...form, testNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="1">Class Test 1 (CT1)</option>
                  <option value="2">Class Test 2 (CT2)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Exam Date</label>
              <input
                type="date"
                required
                value={form.testDate}
                onChange={(e) => setForm({ ...form, testDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time</label>
                <input
                  type="text"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">End Time</label>
                <input
                  type="text"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
            >
              {loading ? "Scheduling..." : "Schedule Class Test"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
