"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  UserX,
  ShieldAlert,
  BookOpen,
  Printer,
} from "lucide-react";

interface ExamDayClientProps {
  activeSession: any;
  rooms: any[];
  allocations: any[];
  absentees: any[];
  initialDate: string;
  initialSlot: string;
  initialRoom?: string;
}

export function ExamDayClient({
  activeSession,
  rooms,
  allocations,
  absentees,
  initialDate,
  initialSlot,
  initialRoom,
}: ExamDayClientProps) {
  const router = useRouter();

  // Distinct slots from papers
  const slotsMap = new Map<string, { date: string; slot: string; label: string }>();
  activeSession?.theoryPapers?.forEach((p: any) => {
    const d = new Date(p.examDate).toISOString().split("T")[0];
    const key = `${d}_${p.slot}`;
    if (!slotsMap.has(key)) {
      slotsMap.set(key, {
        date: d,
        slot: p.slot,
        label: `${new Date(p.examDate).toLocaleDateString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} (${p.slot})`,
      });
    }
  });

  // Rooms that actually have allocations
  const allocatedRoomIds = Array.from(new Set(allocations.map((a) => a.roomId)));
  const activeRooms = rooms.filter((r) => allocatedRoomIds.includes(r.id));

  const [selectedRoomId, setSelectedRoomId] = useState(
    initialRoom || activeRooms[0]?.id || ""
  );
  const [ufmModal, setUfmModal] = useState<any>(null);
  const [ufmDetails, setUfmDetails] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const roomAllocations = allocations.filter((a) => a.roomId === selectedRoomId);

  const getRecord = (paperId: string, studentId: string) =>
    absentees.find((ab) => ab.paperId === paperId && ab.studentId === studentId);

  const toggleAbsent = async (alloc: any) => {
    const existing = getRecord(alloc.paperId, alloc.studentId);
    const nextAbsent = !(existing?.isAbsent);
    setLoadingId(alloc.id);

    try {
      await fetch("/api/supervision/exam-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          paperId: alloc.paperId,
          studentId: alloc.studentId,
          examDate: initialDate,
          slot: initialSlot,
          isAbsent: nextAbsent,
          isUfm: false,
        }),
      });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  const submitUfm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ufmModal) return;
    setLoadingId(ufmModal.id);

    try {
      await fetch("/api/supervision/exam-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          paperId: ufmModal.paperId,
          studentId: ufmModal.studentId,
          examDate: initialDate,
          slot: initialSlot,
          isAbsent: false,
          isUfm: true,
          ufmDetails,
        }),
      });
      setUfmModal(null);
      setUfmDetails("");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  const totalSeated = roomAllocations.length;
  const totalAbsent = roomAllocations.filter((a) => getRecord(a.paperId, a.studentId)?.isAbsent).length;
  const totalUfm = roomAllocations.filter((a) => getRecord(a.paperId, a.studentId)?.isUfm).length;
  const netPresent = totalSeated - totalAbsent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Exam Day Operations Console</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Room-wise attendance, absentees, Unfair Means (UFM) logging, and answer book packet counts
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="print:hidden inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-medium shadow-xs"
        >
          <Printer className="w-3.5 h-3.5 text-blue-600" />
          Print Daily Absentee Report
        </button>
      </div>

      {/* Slot & Room Selectors */}
      <div className="print:hidden bg-white rounded-xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Exam Date & Slot
          </label>
          <select
            value={`${initialDate}_${initialSlot}`}
            onChange={(e) => {
              const [d, s] = e.target.value.split("_");
              router.push(`/supervision/exam-day?date=${d}&slot=${s}`);
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
          >
            {Array.from(slotsMap.values()).map((s) => (
              <option key={`${s.date}_${s.slot}`} value={`${s.date}_${s.slot}`}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select Active Exam Room
          </label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
          >
            {activeRooms.length === 0 && <option value="">No rooms seated for this slot</option>}
            {activeRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.building})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Room Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Seated</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalSeated}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase">Present / Books Recv</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{netPresent}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
          <div className="text-[11px] font-bold text-rose-600 uppercase">Absentees</div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{totalAbsent}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase">UFM Cases</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{totalUfm}</div>
        </div>
      </div>

      {/* UFM Inline Modal */}
      {ufmModal && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
          <div className="text-xs font-bold text-amber-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Record Unfair Means (UFM) Case — {ufmModal.student.name} (Seat: {ufmModal.student.seatNo})
          </div>
          <form onSubmit={submitUfm} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              placeholder="Describe UFM details (e.g. Chits recovered / Mobile phone possession)..."
              value={ufmDetails}
              onChange={(e) => setUfmDetails(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
            >
              Confirm UFM Log
            </button>
            <button
              type="button"
              onClick={() => setUfmModal(null)}
              className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Student Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-4">Bench</th>
                <th className="py-2.5 px-4">Seat No</th>
                <th className="py-2.5 px-4">Student Name</th>
                <th className="py-2.5 px-4">Paper Code</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 print:hidden text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roomAllocations.map((a) => {
                const rec = getRecord(a.paperId, a.studentId);
                const isAbsent = rec?.isAbsent;
                const isUfm = rec?.isUfm;

                return (
                  <tr
                    key={a.id}
                    className={isAbsent ? "bg-rose-50/40" : isUfm ? "bg-amber-50/40" : "hover:bg-slate-50"}
                  >
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      B{a.benchNo} (S{a.seatPosition})
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      {a.student.seatNo || a.student.rollNo}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{a.student.name}</td>
                    <td className="py-2.5 px-4 font-mono text-blue-700 font-bold">
                      {a.paper.paperCode}
                    </td>
                    <td className="py-2.5 px-4">
                      {isUfm ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold text-[10px]">
                          <ShieldAlert className="w-3 h-3" /> UFM: {rec.ufmDetails}
                        </span>
                      ) : isAbsent ? (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded font-bold text-[10px]">
                          <UserX className="w-3 h-3" /> ABSENT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> PRESENT
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 print:hidden text-right space-x-2">
                      <button
                        disabled={loadingId === a.id}
                        onClick={() => toggleAbsent(a)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
                          isAbsent
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        {isAbsent ? "Mark Present" : "Mark Absent"}
                      </button>

                      <button
                        onClick={() => setUfmModal(a)}
                        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                      >
                        Log UFM
                      </button>
                    </td>
                  </tr>
                );
              })}

              {roomAllocations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No seating generated for this date & slot yet. Generate seating in Theory Ops first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
