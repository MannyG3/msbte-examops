"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers } from "lucide-react";

export function SubjectsClient({ subjects }: { subjects: any[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    code: "",
    name: "",
    abbreviation: "",
    schemeName: "K",
    hasSections: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/masters/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ code: "", name: "", abbreviation: "", schemeName: "K", hasSections: false });
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to save subject");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSections = async (subjectId: string, currentVal: boolean) => {
    await fetch("/api/masters/subjects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, hasSections: !currentVal }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Subjects & Schemes (K / I)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supports K-scheme (6-digit) and I-scheme (5-digit) side by side, plus Section I & II flags
          </p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold">
          {subjects.length} Subjects
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Scheme</th>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Subject Name</th>
                  <th className="py-2.5 px-4">Abbr</th>
                  <th className="py-2.5 px-4">Sections (I & II)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                          s.scheme.name === "K"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {s.scheme.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{s.code}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{s.abbreviation}</td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => toggleSections(s.id, s.hasSections)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          s.hasSections
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {s.hasSections ? "2 Books (Sec I & II)" : "Single Book"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Add Subject
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="313303"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Scheme *</label>
                <select
                  value={form.schemeName}
                  onChange={(e) => setForm({ ...form, schemeName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="K">K Scheme</option>
                  <option value="I">I Scheme</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Name *</label>
              <input
                type="text"
                required
                placeholder="DIGITAL TECHNIQUES"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Abbreviation *</label>
              <input
                type="text"
                required
                placeholder="DTE"
                value={form.abbreviation}
                onChange={(e) => setForm({ ...form, abbreviation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs uppercase font-mono"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.hasSections}
                onChange={(e) => setForm({ ...form, hasSections: e.target.checked })}
                className="rounded text-blue-600"
              />
              Has Section I & II (2 answer books)
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
            >
              {loading ? "Saving..." : "Save Subject"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
