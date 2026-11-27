"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function StaffClient({ staff }: { staff: any[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    designation: "Lecturer",
    department: "CO",
    type: "TEACHING",
    subjectsTaught: "",
    maxDutiesPerSession: "10",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/masters/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ ...form, name: "", subjectsTaught: "", email: "", phone: "" });
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to add staff");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Staff & Supervisor Master</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Teaching faculty, lab assistants, and peons with subjects taught and max duty caps
          </p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold">
          {staff.length} Staff
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Dept / Designation</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Subjects Taught</th>
                  <th className="py-2.5 px-4 text-center">Max Duties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      <span className="font-mono font-bold text-slate-800 mr-1">{s.department}</span> • {s.designation}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 border border-slate-200">
                        {s.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-blue-700">
                      {s.subjectsTaught?.join(", ") || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold">{s.maxDutiesPerSession}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Add Staff Member
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="Prof. R. S. Joshi"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="CO">CO</option>
                  <option value="IF">IF</option>
                  <option value="ME">ME</option>
                  <option value="EE">EE</option>
                  <option value="SCI">SCI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="TEACHING">Teaching</option>
                  <option value="LAB_ASSISTANT">Lab Assistant</option>
                  <option value="PEON">Peon</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Designation</label>
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Max Duties</label>
                <input
                  type="number"
                  value={form.maxDutiesPerSession}
                  onChange={(e) => setForm({ ...form, maxDutiesPerSession: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Subjects Taught (comma-separated codes)
              </label>
              <input
                type="text"
                placeholder="313303, 315319"
                value={form.subjectsTaught}
                onChange={(e) => setForm({ ...form, subjectsTaught: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
            >
              {loading ? "Saving..." : "Add Staff"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
