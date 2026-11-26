"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Grid,
} from "lucide-react";

interface AllocateClientProps {
  activeSession: any;
  staffList: any[];
}

export function AllocateClient({ activeSession, staffList }: AllocateClientProps) {
  const router = useRouter();
  const [studentsPerSupervisor, setStudentsPerSupervisor] = useState(30);
  const [assignRelievers, setAssignRelievers] = useState(true);
  const [assignSeniorSupervisor, setAssignSeniorSupervisor] = useState(true);
  const [assignPeons, setAssignPeons] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const existingDutiesCount = activeSession?.supervisionDuties?.length || 0;

  const handleAllocate = async () => {
    setLoading(true);
    setStats(null);
    try {
      const res = await fetch("/api/supervision/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentsPerSupervisor,
          assignRelievers,
          assignSeniorSupervisor,
          assignPeons,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Allocation failed");
        setLoading(false);
        return;
      }

      setStats(data.result?.stats);
      router.refresh();
    } catch {
      alert("Error allocating duties");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Fair Supervision Duty Allocator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Balanced invigilation distribution avoiding self-subject conflicts and back-to-back M/A slots
          </p>
        </div>

        {existingDutiesCount > 0 && (
          <Link
            href="/supervision/chart"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-sm transition"
          >
            <Grid className="w-3.5 h-3.5" />
            View Duty Matrix Chart ({existingDutiesCount})
          </Link>
        )}
      </div>

      {/* Configuration & Trigger */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Students per Junior Supervisor
            </label>
            <select
              value={studentsPerSupervisor}
              onChange={(e) => setStudentsPerSupervisor(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            >
              <option value={24}>24 students / supervisor</option>
              <option value={30}>30 students / supervisor (Standard)</option>
              <option value={40}>40 students / supervisor</option>
            </select>
          </div>

          <div className="space-y-2 pb-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={assignSeniorSupervisor}
                onChange={(e) => setAssignSeniorSupervisor(e.target.checked)}
                className="rounded text-blue-600"
              />
              Assign Senior Supervisor
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={assignRelievers}
                onChange={(e) => setAssignRelievers(e.target.checked)}
                className="rounded text-blue-600"
              />
              Assign Floor Relievers
            </label>
          </div>

          <div className="space-y-2 pb-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={assignPeons}
                onChange={(e) => setAssignPeons(e.target.checked)}
                className="rounded text-blue-600"
              />
              Assign Support Peons
            </label>
            <div className="text-[11px] text-slate-500">
              Total Papers: <strong>{activeSession?._count?.theoryPapers || 0}</strong>
            </div>
          </div>

          <div>
            <button
              disabled={loading}
              onClick={handleAllocate}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-xs shadow-sm transition"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              {loading
                ? "Allocating..."
                : existingDutiesCount > 0
                ? "Re-run Fair Allocation"
                : "Generate Duty Schedule"}
            </button>
          </div>
        </div>
      </div>

      {/* Allocation Stats Banner */}
      {stats && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>
              <strong>Allocation Complete:</strong> Assigned{" "}
              <strong>{stats.totalDutiesAssigned}</strong> supervision duties across the session.
            </span>
          </div>
          <div className="flex items-center gap-4 font-semibold">
            <span>Self-Subject Conflicts Avoided: {stats.subjectConflictsAvoided}</span>
            <span>Back-to-Back M&A: {stats.backToBackCount}</span>
          </div>
        </div>
      )}

      {/* Staff Load Distribution Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Staff Duty Load Balance ({staffList.length} Active Staff)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-4">Staff Name</th>
                <th className="py-2.5 px-4">Designation</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-center">Assigned Duties</th>
                <th className="py-2.5 px-4 text-center">Max Allowed</th>
                <th className="py-2.5 px-4 w-48">Load Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((s) => {
                const assigned = s._count?.supervisionDuties || 0;
                const max = s.maxDutiesPerSession || 10;
                const pct = Math.min(100, Math.round((assigned / max) * 100));

                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{s.designation}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {s.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-blue-700">
                      {assigned}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-600">{max}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 90 ? "bg-amber-500" : "bg-blue-600"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 w-8">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
