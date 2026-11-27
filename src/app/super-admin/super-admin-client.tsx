"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Ban,
  Eye,
  Clock,
  ShieldAlert,
  Building2,
} from "lucide-react";

export function SuperAdminClient({
  institutes,
  plans,
  impersonations,
}: {
  institutes: any[];
  plans: any[];
  impersonations: any[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const pendingCount = institutes.filter((i) => i.status === "PENDING_APPROVAL").length;
  const activeCount = institutes.filter((i) => i.status === "ACTIVE" || i.status === "TRIAL").length;

  const handleTenantAction = async (instituteId: string, action: string, planId?: string) => {
    setLoadingId(instituteId);
    try {
      const res = await fetch("/api/super-admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instituteId, action, planId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to update tenant");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleImpersonate = async (inst: any) => {
    const reason = window.prompt(
      `Enter support reason for impersonating ${inst.name} (logged to audit trail):`,
      "Support & onboarding verification"
    );
    if (!reason) return;

    setLoadingId(inst.id);
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instituteId: inst.id, reason }),
      });
      const data = await res.json();
      if (res.ok && data.redirectTo) {
        router.push(data.redirectTo);
        router.refresh();
      } else {
        alert(data.error || "Impersonation failed");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "TRIAL":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "EXPIRED":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "SUSPENDED":
        return "bg-slate-200 text-slate-700 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Polytechnic Tenants</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{institutes.length}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs">
          <div className="text-xs font-semibold text-emerald-600 uppercase">Active & Trial Centres</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{activeCount}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs">
          <div className="text-xs font-semibold text-amber-600 uppercase">Pending Trial Approvals</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{pendingCount}</div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" /> Registered Institutes & Exam Centres
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Inst / EC Code</th>
                <th className="py-3 px-4">Institute Name & Contact</th>
                <th className="py-3 px-4">Status & Expiry</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {institutes.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono whitespace-nowrap">
                    <div className="font-bold text-slate-900">Inst: {inst.code}</div>
                    <div className="text-[11px] text-blue-700 font-semibold">
                      EC: {inst.examCentreCode || "—"}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">
                      {inst.name}{" "}
                      {inst.isDemo && (
                        <span className="ml-1 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                          DEMO
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {inst.region} • {inst.contactPerson || "Admin"} ({inst.contactEmail || "—"})
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge(inst.status)}`}>
                      {inst.status}
                    </span>
                    {inst.validUntil && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        Valid: {new Date(inst.validUntil).toLocaleDateString("en-IN")}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <select
                      value={inst.planId || ""}
                      onChange={(e) => handleTenantAction(inst.id, "UPDATE_PLAN", e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    >
                      <option value="">No Plan</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.maxCandidatesPerSession} max)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-600">
                    <div>{inst._count.blocks} blocks • {inst._count.staff} staff</div>
                    <div>{inst._count.sessions} sessions • {inst._count.memberships} users</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                    {inst.status === "PENDING_APPROVAL" && (
                      <button
                        disabled={loadingId === inst.id}
                        onClick={() => handleTenantAction(inst.id, "APPROVE_TRIAL")}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold"
                      >
                        Approve 30d Trial
                      </button>
                    )}
                    {inst.status !== "ACTIVE" && (
                      <button
                        disabled={loadingId === inst.id}
                        onClick={() => handleTenantAction(inst.id, "ACTIVATE")}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                      >
                        Activate
                      </button>
                    )}
                    {inst.status !== "SUSPENDED" && (
                      <button
                        disabled={loadingId === inst.id}
                        onClick={() => handleTenantAction(inst.id, "SUSPEND")}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      disabled={loadingId === inst.id}
                      onClick={() => handleImpersonate(inst)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[11px] font-semibold"
                    >
                      <Eye className="w-3 h-3" /> Impersonate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Impersonation Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
          Recent Super-Admin Impersonation Log
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {impersonations.map((imp) => (
            <div key={imp.id} className="p-3 flex items-center justify-between">
              <div>
                <strong>{imp.superAdmin.email}</strong> impersonated{" "}
                <strong className="text-blue-700">{imp.institute.name}</strong> —{" "}
                <span className="text-slate-600">Reason: {imp.reason}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {new Date(imp.startedAt).toLocaleString()}
              </div>
            </div>
          ))}
          {impersonations.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">No impersonation events logged.</div>
          )}
        </div>
      </div>
    </div>
  );
}
