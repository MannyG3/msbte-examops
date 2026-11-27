"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  CalendarDays,
  RefreshCw,
  ArrowLeftRight,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

interface DaySlot {
  examDay: number;
  examDate: string;
  slot: string;
}

interface StaffItem {
  id: string;
  name: string;
  designation: string;
  department: string;
  type: string;
  maxDutiesPerSession: number;
}

interface DutyItem {
  id: string;
  examDay: number;
  examDate: string;
  slot: string;
  blockId: string | null;
  blockNo: number | null;
  roomNo: string | null;
  staffId: string;
  staffName: string;
  staffDept: string;
  role: string;
  version: number;
  isOverride: boolean;
}

interface SwapItem {
  id: string;
  dutyId: string;
  examDay: number;
  slot: string;
  role: string;
  blockNo: number | null;
  requesterName: string;
  targetName: string;
  reason: string;
  status: string;
}

export function SupervisionClient({
  initialData,
}: {
  initialData: {
    sessionName: string;
    daySlots: DaySlot[];
    staff: StaffItem[];
    duties: DutyItem[];
    swaps: SwapItem[];
  };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ROSTER" | "LOAD" | "CHART" | "SWAPS">("ROSTER");
  const [selectedSlotKey, setSelectedSlotKey] = useState<string>(
    initialData.daySlots[0] ? `${initialData.daySlots[0].examDay}:${initialData.daySlots[0].slot}` : ""
  );
  const [relieversPerNBlocks, setRelieversPerNBlocks] = useState(4);
  const [seniorCount, setSeniorCount] = useState(1);
  const [avoidOwnSubject, setAvoidOwnSubject] = useState(true);
  const [avoidBackToBack, setAvoidBackToBack] = useState(true);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Swap modal state
  const [swapDutyId, setSwapDutyId] = useState<string | null>(null);
  const [swapTargetStaffId, setSwapTargetStaffId] = useState("");
  const [swapReason, setSwapReason] = useState("");

  const [selDay, selSlot] = selectedSlotKey ? selectedSlotKey.split(":") : ["1", "MORNING"];

  const slotDuties = useMemo(() => {
    return initialData.duties
      .filter((d) => d.examDay === Number(selDay) && d.slot === selSlot)
      .sort((a, b) => {
        if (a.role !== b.role) {
          const order: Record<string, number> = { SENIOR: 0, JUNIOR: 1, RELIEVER: 2 };
          return (order[a.role] ?? 9) - (order[b.role] ?? 9);
        }
        return (a.blockNo ?? 999) - (b.blockNo ?? 999);
      });
  }, [initialData.duties, selDay, selSlot]);

  const staffLoad = useMemo(() => {
    return initialData.staff.map((s) => {
      const myDuties = initialData.duties.filter((d) => d.staffId === s.id);
      return {
        ...s,
        total: myDuties.length,
        junior: myDuties.filter((d) => d.role === "JUNIOR").length,
        reliever: myDuties.filter((d) => d.role === "RELIEVER").length,
        senior: myDuties.filter((d) => d.role === "SENIOR").length,
      };
    });
  }, [initialData.staff, initialData.duties]);

  const handleAllocate = async (mode: "DAY_SLOT" | "SESSION") => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/allocators/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          examDay: Number(selDay),
          slot: selSlot,
          relieversPerNBlocks,
          seniorCount,
          avoidOwnSubject,
          avoidBackToBack,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Allocation failed");
      setMessage({
        type: "ok",
        text: `Allocated ${json.allocatedCount} duties (Version v${json.version}). Unfilled: ${json.unfilledCount}.`,
      });
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (dutyId: string, newStaffId: string) => {
    if (!newStaffId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/allocators/supervision", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dutyId, newStaffId, reason: "Manual OIC override" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Override failed");
      setMessage({ type: "ok", text: "Duty updated and marked as manual override." });
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapDutyId || !swapTargetStaffId || !swapReason) return;
    setLoading(true);
    try {
      const res = await fetch("/api/supervision/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dutyId: swapDutyId,
          targetStaffId: swapTargetStaffId,
          reason: swapReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Swap request failed");
      setSwapDutyId(null);
      setSwapTargetStaffId("");
      setSwapReason("");
      setMessage({ type: "ok", text: "Swap request submitted for OIC approval." });
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSwap = async (swapId: string, action: "APPROVE" | "REJECT") => {
    setLoading(true);
    try {
      const res = await fetch("/api/supervision/swaps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Swap review failed");
      setMessage({ type: "ok", text: `Swap request ${action === "APPROVE" ? "approved & chart updated" : "rejected"}.` });
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supervisor Allocation</h1>
          <p className="text-sm text-slate-600">
            Session: <span className="font-semibold text-slate-800">{initialData.sessionName}</span> ·{" "}
            {initialData.duties.length} total duties assigned across {initialData.staff.length} staff
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/reports/supervisor-allocation?day=${selDay}&slot=${selSlot}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Slot Report
          </Link>
          <Link
            href="/reports/duty-chart"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Full Duty Chart
          </Link>
        </div>
      </div>

      {/* Allocation Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Day & Slot</label>
            <select
              value={selectedSlotKey}
              onChange={(e) => setSelectedSlotKey(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {initialData.daySlots.map((ds) => (
                <option key={`${ds.examDay}:${ds.slot}`} value={`${ds.examDay}:${ds.slot}`}>
                  Day {ds.examDay} · {ds.examDate} · {ds.slot}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">1 Reliever per N Blocks</label>
            <input
              type="number"
              min={1}
              max={10}
              value={relieversPerNBlocks}
              onChange={(e) => setRelieversPerNBlocks(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Senior Supervisors / Slot</label>
            <input
              type="number"
              min={0}
              max={5}
              value={seniorCount}
              onChange={(e) => setSeniorCount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="space-y-1.5 text-xs text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={avoidOwnSubject}
                onChange={(e) => setAvoidOwnSubject(e.target.checked)}
              />
              Avoid own subject
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={avoidBackToBack}
                onChange={(e) => setAvoidBackToBack(e.target.checked)}
              />
              Avoid M+A back-to-back
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAllocate("DAY_SLOT")}
              disabled={loading || !selectedSlotKey}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Allocate Slot
            </button>
            <button
              onClick={() => handleAllocate("SESSION")}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              All 18 Days
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-medium">
        {[
          { key: "ROSTER", label: `Slot Roster (${slotDuties.length})` },
          { key: "LOAD", label: `Staff Load Table (${staffLoad.length})` },
          { key: "CHART", label: `Session Duty Chart (${initialData.duties.length})` },
          {
            key: "SWAPS",
            label: `Swap Requests (${initialData.swaps.filter((s) => s.status === "PENDING").length} pending)`,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Slot Roster */}
      {activeTab === "ROSTER" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {slotDuties.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No supervisor duties allocated for Day {selDay} ({selSlot}) yet. Click{" "}
              <strong>Allocate Slot</strong> or <strong>All 18 Days</strong> above.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Block / Room</th>
                  <th className="px-4 py-3">Assigned Supervisor</th>
                  <th className="px-4 py-3">Dept</th>
                  <th className="px-4 py-3">Manual Override</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slotDuties.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          d.role === "SENIOR"
                            ? "bg-purple-100 text-purple-800"
                            : d.role === "RELIEVER"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {d.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {d.blockNo ? `Block ${d.blockNo} (${d.roomNo})` : "All Blocks"}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {d.staffName}
                      {d.isOverride && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                          Override v{d.version}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{d.staffDept}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value=""
                        onChange={(e) => handleOverride(d.id, e.target.value)}
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                      >
                        <option value="">Reassign to...</option>
                        {initialData.staff
                          .filter((s) => s.id !== d.staffId)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.department})
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-2">
                      <button
                        onClick={() => setSwapDutyId(d.id)}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                      >
                        <ArrowLeftRight className="w-3 h-3" /> Swap
                      </button>
                      <Link
                        href={`/reports/duty-letter/${d.staffId}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-600 hover:underline"
                      >
                        <Printer className="w-3 h-3" /> Letter
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Staff Load Table */}
      {activeTab === "LOAD" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Staff Name</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-center">Junior</th>
                <th className="px-4 py-3 text-center">Reliever</th>
                <th className="px-4 py-3 text-center">Senior</th>
                <th className="px-4 py-3">Total / Max</th>
                <th className="px-4 py-3 text-right">Duty Letter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffLoad.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.department}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{s.type}</td>
                  <td className="px-4 py-2.5 text-center">{s.junior}</td>
                  <td className="px-4 py-2.5 text-center">{s.reliever}</td>
                  <td className="px-4 py-2.5 text-center">{s.senior}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {s.total} / {s.maxDutiesPerSession}
                      </span>
                      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600"
                          style={{
                            width: `${Math.min(100, (s.total / Math.max(1, s.maxDutiesPerSession)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/reports/duty-letter/${s.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                    >
                      <Printer className="w-3.5 h-3.5" /> View Letter
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Session Duty Chart Summary */}
      {activeTab === "CHART" && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              All Allocated Duties Across Session ({initialData.duties.length})
            </h2>
            <Link
              href="/reports/duty-chart"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg"
            >
              <Printer className="w-3.5 h-3.5" /> Open Printable Duty Chart
            </Link>
          </div>
          <div className="max-h-[480px] overflow-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2">Day</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Slot</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Block</th>
                  <th className="px-3 py-2">Staff</th>
                  <th className="px-3 py-2">Dept</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialData.duties.slice(0, 200).map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-1.5 font-medium">Day {d.examDay}</td>
                    <td className="px-3 py-1.5">{d.examDate}</td>
                    <td className="px-3 py-1.5">{d.slot}</td>
                    <td className="px-3 py-1.5">{d.role}</td>
                    <td className="px-3 py-1.5">{d.blockNo ? `Block ${d.blockNo}` : "—"}</td>
                    <td className="px-3 py-1.5 font-medium text-slate-800">{d.staffName}</td>
                    <td className="px-3 py-1.5 text-slate-500">{d.staffDept}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Swap Requests */}
      {activeTab === "SWAPS" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {initialData.swaps.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No swap requests yet. Click <strong>Swap</strong> on any duty in the Slot Roster tab.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Day & Slot</th>
                  <th className="px-4 py-3">Duty</th>
                  <th className="px-4 py-3">Requester → Target</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialData.swaps.map((sw) => (
                  <tr key={sw.id}>
                    <td className="px-4 py-2.5">
                      Day {sw.examDay} ({sw.slot})
                    </td>
                    <td className="px-4 py-2.5">
                      {sw.role} {sw.blockNo ? `· Block ${sw.blockNo}` : ""}
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      {sw.requesterName} → {sw.targetName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{sw.reason}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          sw.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : sw.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {sw.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-2">
                      {sw.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleReviewSwap(sw.id, "APPROVE")}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReviewSwap(sw.id, "REJECT")}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Swap Modal */}
      {swapDutyId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSwap}
            className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">Request Duty Swap</h3>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Swap With Staff</label>
              <select
                required
                value={swapTargetStaffId}
                onChange={(e) => setSwapTargetStaffId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="">Select target faculty...</option>
                {initialData.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
              <textarea
                required
                rows={3}
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                placeholder="e.g., Official MSBTE practical duty / medical leave"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSwapDutyId(null)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
              >
                Submit Swap Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
