"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, ArrowRightLeft, FileText, CheckCircle2, Clock, X } from "lucide-react";

interface MyDutiesClientProps {
  staff: any;
  duties: any[];
  otherStaff: any[];
  mySwaps: any[];
}

export function MyDutiesClient({ staff, duties, otherStaff, mySwaps }: MyDutiesClientProps) {
  const router = useRouter();
  const [swapDuty, setSwapDuty] = useState<any>(null);
  const [targetStaffId, setTargetStaffId] = useState(otherStaff[0]?.id || "");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapDuty || !targetStaffId || !reason) return;
    setLoading(true);

    try {
      const res = await fetch("/api/supervision/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dutyId: swapDuty.id,
          targetStaffId,
          reason,
        }),
      });
      if (res.ok) {
        setSwapDuty(null);
        setReason("");
        router.refresh();
      } else {
        alert("Failed to submit swap request");
      }
    } catch {
      alert("Error submitting swap");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            My Invigilation Duties ({staff?.name || "Faculty"})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Assigned examination supervision schedule and swap request management
          </p>
        </div>

        {staff && (
          <Link
            href={`/supervision/print/letter?staffId=${staff.id}`}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-sm transition"
          >
            <FileText className="w-3.5 h-3.5" />
            Download Appointment Letter
          </Link>
        )}
      </div>

      {/* Assigned Duties */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
          Scheduled Duties ({duties.length})
        </div>

        <div className="divide-y divide-slate-100">
          {duties.map((d) => (
            <div key={d.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {new Date(d.examDate).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                      {d.slot} ({d.slot === "MORNING" ? "09:30 AM" : "02:00 PM"})
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Role: <strong>{d.role.replace("_", " ")}</strong> • Block:{" "}
                    <strong>{d.room?.name || "Control Room / Floor"}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSwapDuty(d)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                Request Swap
              </button>
            </div>
          ))}

          {duties.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No duties currently assigned to {staff?.name}.
            </div>
          )}
        </div>
      </div>

      {/* Swap Modal */}
      {swapDuty && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-blue-950">
              Request Duty Swap ({new Date(swapDuty.examDate).toLocaleDateString()} - {swapDuty.slot})
            </h2>
            <button onClick={() => setSwapDuty(null)} className="text-slate-500 hover:text-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmitSwap} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Replacement Faculty Member
              </label>
              <select
                value={targetStaffId}
                onChange={(e) => setTargetStaffId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                {otherStaff.map((os) => (
                  <option key={os.id} value={os.id}>
                    {os.name} ({os.designation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Swap
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Medical leave / External practical duty"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs shadow-sm"
            >
              {loading ? "Submitting..." : "Submit Swap Request"}
            </button>
          </form>
        </div>
      )}

      {/* My Swap Requests History */}
      {mySwaps.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
            My Swap Requests ({mySwaps.length})
          </div>
          <div className="divide-y divide-slate-100">
            {mySwaps.map((s) => (
              <div key={s.id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">
                    {new Date(s.duty.examDate).toLocaleDateString()} ({s.duty.slot}) →{" "}
                    <span className="text-blue-700">{s.target.name}</span>
                  </div>
                  <div className="text-slate-500 mt-0.5">Reason: {s.reason}</div>
                </div>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
