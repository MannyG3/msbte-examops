"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, ArrowRightLeft } from "lucide-react";

export function SwapsClient({ swapRequests }: { swapRequests: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (swapId: string, action: "APPROVED" | "REJECTED") => {
    setLoadingId(swapId);
    try {
      const res = await fetch("/api/supervision/swaps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapId, action }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Action failed");
      }
    } catch {
      alert("Error updating swap");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/supervision/chart"
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Duty Chart
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Coordinator Duty Swap Approvals</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Approve or reject faculty duty swap requests; updates the master chart and writes to audit log
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {swapRequests.map((s) => (
            <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900">{s.requester.name}</span>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-blue-700">{s.target.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                      s.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : s.status === "REJECTED"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Exam: <strong>{new Date(s.duty.examDate).toLocaleDateString()}</strong> ({s.duty.slot}) • Room:{" "}
                  <strong>{s.duty.room?.name || "Control Room"}</strong>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Reason: {s.reason}</div>
              </div>

              {s.status === "PENDING" && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={loadingId === s.id}
                    onClick={() => handleAction(s.id, "APPROVED")}
                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    disabled={loadingId === s.id}
                    onClick={() => handleAction(s.id, "REJECTED")}
                    className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}

          {swapRequests.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No duty swap requests submitted yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
