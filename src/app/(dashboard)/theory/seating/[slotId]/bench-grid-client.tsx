"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  Unlock,
  Printer,
  Calendar,
  DoorOpen,
  ArrowRightLeft,
  Check,
  X,
} from "lucide-react";

interface BenchGridClientProps {
  room: any;
  allocations: any[];
  examDate: string;
  slot: string;
}

export function BenchGridClient({ room, allocations, examDate, slot }: BenchGridClientProps) {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(room.isLocked || false);
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleLock = async () => {
    try {
      const res = await fetch("/api/theory/seating/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, isLocked: !isLocked }),
      });
      if (res.ok) {
        setIsLocked(!isLocked);
        router.refresh();
      }
    } catch {
      alert("Failed to toggle room lock");
    }
  };

  const handleSwapClick = async (allocationId: string) => {
    if (isLocked) {
      alert("Room is locked. Unlock before adjusting seats.");
      return;
    }

    if (!swapSourceId) {
      setSwapSourceId(allocationId);
    } else if (swapSourceId === allocationId) {
      setSwapSourceId(null);
    } else {
      setLoading(true);
      try {
        const res = await fetch("/api/theory/seating/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allocationIdA: swapSourceId,
            allocationIdB: allocationId,
          }),
        });

        if (!res.ok) {
          alert("Failed to swap seats");
        } else {
          setSwapSourceId(null);
          router.refresh();
        }
      } catch {
        alert("An error occurred during swap");
      } finally {
        setLoading(false);
      }
    }
  };

  // Group allocations by bench
  const benches = Array.from({ length: room.benchCount }, (_, i) => i + 1);

  // Distinct paper codes for coloring
  const paperCodes = Array.from(new Set(allocations.map((a) => a.paper.paperCode)));
  const getPaperColor = (code: string) => {
    const idx = paperCodes.indexOf(code);
    const colors = [
      "bg-blue-50 text-blue-800 border-blue-300 ring-blue-500",
      "bg-purple-50 text-purple-800 border-purple-300 ring-purple-500",
      "bg-amber-50 text-amber-800 border-amber-300 ring-amber-500",
      "bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500",
    ];
    return colors[idx % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/theory/seating?date=${examDate}&slot=${slot}`}
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Seating Overview
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{room.name} Bench Layout</h1>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-200 font-mono">
              {allocations.length} / {room.totalCapacity} Seated
            </span>
            {isLocked && (
              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
            <span>{examDate} ({slot})</span>
            <span>•</span>
            <span>{room.building} (Floor {room.floor})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLock}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isLocked
                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {isLocked ? "Room Locked" : "Lock Room"}
          </button>

          <Link
            href={`/theory/print/door-chart?date=${examDate}&slot=${slot}&room=${room.id}`}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3.5 py-1.5 rounded-lg text-xs shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Door Chart PDF
          </Link>
        </div>
      </div>

      {/* Swap banner info if active */}
      {swapSourceId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            <span>
              <strong>Swap Mode Active:</strong> Click on another student to swap their seats.
            </span>
          </div>
          <button
            onClick={() => setSwapSourceId(null)}
            className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Cancel Swap
          </button>
        </div>
      )}

      {/* Classroom Podium Marker */}
      <div className="w-48 mx-auto py-1.5 bg-slate-200 text-slate-600 rounded-md text-[11px] font-bold uppercase tracking-wider text-center border border-slate-300">
        Blackboard / Invigilator Podium
      </div>

      {/* Benches Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {benches.map((benchNo) => {
          const seatLeft = allocations.find((a) => a.benchNo === benchNo && a.seatPosition === 1);
          const seatRight = allocations.find((a) => a.benchNo === benchNo && a.seatPosition === 2);

          return (
            <div
              key={benchNo}
              className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 text-xs">
                <span className="font-bold text-slate-700">Bench {benchNo}</span>
                <span className="text-[10px] text-slate-400">2 Seats</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Seat 1 (Left) */}
                <div
                  onClick={() => seatLeft && handleSwapClick(seatLeft.id)}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    seatLeft ? getPaperColor(seatLeft.paper.paperCode) : "bg-slate-50 border-dashed border-slate-200"
                  } ${swapSourceId === seatLeft?.id ? "ring-2 ring-blue-600 scale-[1.02]" : ""}`}
                >
                  <div className="text-[10px] text-slate-400 font-semibold mb-1">
                    Seat 1 (Left)
                  </div>
                  {seatLeft ? (
                    <div>
                      <div className="font-mono font-bold text-xs truncate">
                        Seat: {seatLeft.student.seatNo || seatLeft.student.rollNo}
                      </div>
                      <div className="text-[11px] font-medium text-slate-900 truncate">
                        {seatLeft.student.name}
                      </div>
                      <div className="mt-1 font-mono text-[10px] font-bold bg-white/80 px-1 rounded border inline-block">
                        {seatLeft.paper.paperCode}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">Empty</div>
                  )}
                </div>

                {/* Seat 2 (Right) */}
                <div
                  onClick={() => seatRight && handleSwapClick(seatRight.id)}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    seatRight ? getPaperColor(seatRight.paper.paperCode) : "bg-slate-50 border-dashed border-slate-200"
                  } ${swapSourceId === seatRight?.id ? "ring-2 ring-blue-600 scale-[1.02]" : ""}`}
                >
                  <div className="text-[10px] text-slate-400 font-semibold mb-1">
                    Seat 2 (Right)
                  </div>
                  {seatRight ? (
                    <div>
                      <div className="font-mono font-bold text-xs truncate">
                        Seat: {seatRight.student.seatNo || seatRight.student.rollNo}
                      </div>
                      <div className="text-[11px] font-medium text-slate-900 truncate">
                        {seatRight.student.name}
                      </div>
                      <div className="mt-1 font-mono text-[10px] font-bold bg-white/80 px-1 rounded border inline-block">
                        {seatRight.paper.paperCode}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">Empty</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
