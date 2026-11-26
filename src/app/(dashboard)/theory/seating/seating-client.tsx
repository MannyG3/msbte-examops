"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Grid,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
  Unlock,
  Printer,
  ArrowRight,
  DoorOpen,
  Users,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface SeatingClientProps {
  activeSession: any;
  rooms: any[];
  initialDate?: string;
  initialSlot?: string;
}

export function SeatingClient({ activeSession, rooms, initialDate, initialSlot }: SeatingClientProps) {
  const router = useRouter();

  // Extract distinct dates & slots from theory papers
  const papers = activeSession?.theoryPapers || [];

  const slotsMap = new Map<string, { date: string; slot: string; label: string; count: number }>();
  papers.forEach((p: any) => {
    const d = new Date(p.examDate).toISOString().split("T")[0];
    const key = `${d}_${p.slot}`;
    if (!slotsMap.has(key)) {
      const formatted = new Date(p.examDate).toLocaleDateString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      slotsMap.set(key, {
        date: d,
        slot: p.slot,
        label: `${formatted} (${p.slot})`,
        count: 0,
      });
    }
    slotsMap.get(key)!.count++;
  });

  const availableSlots = Array.from(slotsMap.values());
  const defaultSlot = availableSlots[0] || { date: "2026-11-17", slot: "MORNING" };

  const [selectedDate, setSelectedDate] = useState(initialDate || defaultSlot.date);
  const [selectedSlot, setSelectedSlot] = useState(initialSlot || defaultSlot.slot);
  const [alternateOnBench, setAlternateOnBench] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generationStats, setGenerationStats] = useState<any>(null);

  // Papers in selected slot
  const currentSlotPapers = papers.filter((p: any) => {
    const d = new Date(p.examDate).toISOString().split("T")[0];
    return d === selectedDate && p.slot === selectedSlot;
  });

  // Calculate current allocations for this slot
  const currentAllocations: any[] = [];
  currentSlotPapers.forEach((p: any) => {
    p.seatingAllocations?.forEach((a: any) => {
      currentAllocations.push({
        ...a,
        paperCode: p.paperCode,
        paperName: p.paperName,
      });
    });
  });

  // Group allocations by room
  const roomAllocationsMap = new Map<string, any[]>();
  currentAllocations.forEach((a) => {
    if (!roomAllocationsMap.has(a.roomId)) {
      roomAllocationsMap.set(a.roomId, []);
    }
    roomAllocationsMap.get(a.roomId)!.push(a);
  });

  const handleGenerate = async () => {
    setLoading(true);
    setGenerationStats(null);

    try {
      const res = await fetch("/api/theory/seating/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate: selectedDate,
          slot: selectedSlot,
          alternateOnBench,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to generate seating plan");
        setLoading(false);
        return;
      }

      setGenerationStats(data.result?.stats);
      router.refresh();
    } catch {
      alert("An error occurred during generation");
    } finally {
      setLoading(false);
    }
  };

  const isSeated = currentAllocations.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Theory Seating Arrangement Generator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Greedy + constraint solver for alternating paper bench allocation and door charts
          </p>
        </div>

        {isSeated && (
          <div className="flex items-center gap-2">
            <Link
              href={`/theory/print/door-chart?date=${selectedDate}&slot=${selectedSlot}`}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              Print Door Charts (PDF)
            </Link>
            <Link
              href={`/theory/print/notice-board?date=${selectedDate}&slot=${selectedSlot}`}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3.5 py-1.5 rounded-lg text-xs shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Notice Board List
            </Link>
          </div>
        )}
      </div>

      {/* Control Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          {/* Slot Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Exam Session Slot
            </label>
            <select
              value={`${selectedDate}_${selectedSlot}`}
              onChange={(e) => {
                const [d, s] = e.target.value.split("_");
                setSelectedDate(d);
                setSelectedSlot(s);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
            >
              {availableSlots.map((s) => (
                <option key={`${s.date}_${s.slot}`} value={`${s.date}_${s.slot}`}>
                  {s.label} ({s.count} papers)
                </option>
              ))}
            </select>
          </div>

          {/* Alternating Checkbox */}
          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="alternate"
              checked={alternateOnBench}
              onChange={(e) => setAlternateOnBench(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-slate-300"
            />
            <label htmlFor="alternate" className="text-xs text-slate-700 font-medium cursor-pointer">
              Alternate Papers on Bench (Prevent adjacent cheating)
            </label>
          </div>

          {/* Generate Button */}
          <div>
            <button
              disabled={loading || currentSlotPapers.length === 0}
              onClick={handleGenerate}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-xs shadow-sm transition"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              {loading ? "Generating Seating..." : isSeated ? "Regenerate Seating Plan" : "Generate Seating Plan"}
            </button>
          </div>
        </div>

        {/* Papers in this slot indicator */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Running Papers:</span>
          {currentSlotPapers.map((p: any) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-medium border border-slate-200"
            >
              <strong className="font-mono text-blue-700">{p.paperCode}</strong>
              <span className="text-slate-600 truncate max-w-[150px]">{p.paperName}</span>
              <span className="bg-slate-200/80 px-1.5 py-0.2 rounded text-[10px] font-mono">
                {p.schemeString}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Generation Stats Alert */}
      {generationStats && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="font-bold">Seating Arrangement Generated Successfully!</span> Allocated{" "}
              <strong>{generationStats.totalAllocated}</strong> students across{" "}
              <strong>{generationStats.totalRoomsUsed}</strong> rooms.
            </div>
          </div>
          <div className="font-semibold text-emerald-800">
            Adjacent Clashes: {generationStats.adjacentPaperClashes}
          </div>
        </div>
      )}

      {/* Rooms Seating Grid */}
      {isSeated ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Allocated Examination Rooms ({roomAllocationsMap.size})
            </h2>
            <span className="text-xs text-slate-500">
              Total Students Seated: <strong className="text-blue-700">{currentAllocations.length}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(roomAllocationsMap.entries()).map(([roomId, allocs]) => {
              const room = rooms.find((r) => r.id === roomId);
              const roomName = room?.name || "Room";

              // Paper distribution in this room
              const paperCounts: Record<string, { count: number; start: string; end: string }> = {};
              allocs.forEach((a) => {
                if (!paperCounts[a.paperCode]) {
                  paperCounts[a.paperCode] = { count: 0, start: a.student?.seatNo, end: a.student?.seatNo };
                }
                paperCounts[a.paperCode].count++;
                if (a.student?.seatNo) {
                  paperCounts[a.paperCode].end = a.student.seatNo;
                }
              });

              return (
                <div
                  key={roomId}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 transition"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <DoorOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{roomName}</h3>
                          <div className="text-[11px] text-slate-400">
                            {room?.building} • Floor {room?.floor}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-blue-700">{allocs.length}</span>
                        <span className="text-[10px] text-slate-400"> / {room?.totalCapacity} seats</span>
                      </div>
                    </div>

                    {/* Paper Seat Range breakdown */}
                    <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-100">
                      {Object.entries(paperCounts).map(([code, info]) => (
                        <div
                          key={code}
                          className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-blue-700 mr-2">{code}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {info.start || "—"} to {info.end || "—"}
                            </span>
                          </div>
                          <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {info.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/theory/seating/${roomId}?date=${selectedDate}&slot=${selectedSlot}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      View Bench Grid <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      href={`/theory/print/door-chart?date=${selectedDate}&slot=${selectedSlot}&room=${roomId}`}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" /> Door Sheet
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center mb-3">
            <Grid className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">No Seating Generated for this Slot Yet</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click "Generate Seating Plan" above to run the alternating bench algorithm for {currentSlotPapers.length} papers.
          </p>
        </div>
      )}
    </div>
  );
}
