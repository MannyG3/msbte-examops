"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Users, FileText, ArrowLeft } from "lucide-react";

export function ExaminersClient({ examiners, externalSlots }: { examiners: any[]; externalSlots: any[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", collegeName: "", phone: "", email: "", subjects: "" });
  const [loading, setLoading] = useState(false);

  const handleAddExaminer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/practicals/examiners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ name: "", collegeName: "", phone: "", email: "", subjects: "" });
        router.refresh();
      } else {
        alert("Failed to add external examiner");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (slotId: string, externalExaminerId: string) => {
    await fetch("/api/practicals/examiners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, externalExaminerId }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/practicals/planner"
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Practical Planner
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            External Examiner Directory & Pairing
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage external polytechnic faculty and assign them to #-tagged practical slots
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: External Slots Pairing + Directory */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pairing Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
              External Practical Slots Requiring Examiner ({externalSlots.length})
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {externalSlots.map((slot) => (
                <div key={slot.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">
                      <span className="font-mono text-blue-700 mr-1.5">{slot.course.code}</span>
                      {slot.course.title} (Batch {slot.division.name}-{slot.batch.name})
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {new Date(slot.examDate).toLocaleDateString()} • {slot.startTime} – {slot.endTime}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={slot.externalExaminerId || ""}
                      onChange={(e) => handleAssign(slot.id, e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">-- Assign External --</option>
                      {examiners.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} ({ex.collegeName})
                        </option>
                      ))}
                    </select>

                    {slot.externalExaminerId && (
                      <Link
                        href={`/practicals/letters?slotId=${slot.id}`}
                        className="p-1.5 bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100"
                        title="Print Appointment Letter & Mark Sheet"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}

              {externalSlots.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500">
                  No external practical slots scheduled yet. Generate timetable in Practical Planner first.
                </div>
              )}
            </div>
          </div>

          {/* Directory */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
              External Examiner Directory ({examiners.length})
            </div>
            <div className="divide-y divide-slate-100">
              {examiners.map((ex) => (
                <div key={ex.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{ex.name}</div>
                    <div className="text-slate-500">
                      {ex.collegeName} • {ex.phone} • {ex.email}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {ex.subjects || "All CO"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Add Examiner */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Add External Examiner
          </h2>
          <form onSubmit={handleAddExaminer} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="Prof. R. K. Deshpande"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Institute / College *</label>
              <input
                type="text"
                required
                placeholder="Cusrow Wadia Institute of Technology"
                value={form.collegeName}
                onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="9822000111"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="rk@cwit.ac.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Subjects (Codes)</label>
              <input
                type="text"
                placeholder="315319, 315320"
                value={form.subjects}
                onChange={(e) => setForm({ ...form, subjects: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
            >
              {loading ? "Saving..." : "Add to Directory"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
