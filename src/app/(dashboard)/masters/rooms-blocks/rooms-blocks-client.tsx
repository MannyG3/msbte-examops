"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DoorOpen, Plus } from "lucide-react";

export function RoomsBlocksClient({ blocks }: { blocks: any[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    blockNo: String(blocks.length + 1),
    roomNo: "",
    building: "Main Building",
    floor: "1",
    columns: "4",
    columnBreak: "9",
    numberingStyle: "SERPENTINE",
  });
  const [loading, setLoading] = useState(false);

  const totalCapacity = blocks.reduce((sum, b) => sum + b.strength, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/masters/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({
          ...form,
          blockNo: String(Number(form.blockNo) + 1),
          roomNo: "",
        });
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to save block");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Rooms & Seating Blocks</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Block NO mapped to physical Room No • Strength = Columns × Column Break (e.g. 4 × 9 = 36)
          </p>
        </div>
        <div className="text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 font-semibold">
          {blocks.length} Blocks • {totalCapacity} Total Benches
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Block NO</th>
                  <th className="py-2.5 px-4">Room No</th>
                  <th className="py-2.5 px-4">Building / Floor</th>
                  <th className="py-2.5 px-4">Layout (Cols × Break)</th>
                  <th className="py-2.5 px-4">Strength</th>
                  <th className="py-2.5 px-4">Numbering</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blocks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-700">Block {b.blockNo}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{b.room?.roomNo}</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {b.room?.building} • Fl {b.room?.floor}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      {b.columns} × {b.columnBreak}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{b.strength}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 border border-slate-200">
                        {b.numberingStyle}
                      </span>
                    </td>
                  </tr>
                ))}
                {blocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No blocks configured yet. Add a block on the right.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Add / Update Block
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Block NO *</label>
                <input
                  type="number"
                  required
                  value={form.blockNo}
                  onChange={(e) => setForm({ ...form, blockNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Room No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. F-11"
                  value={form.roomNo}
                  onChange={(e) => setForm({ ...form, roomNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Building</label>
                <input
                  type="text"
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Floor</label>
                <input
                  type="number"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Columns</label>
                <input
                  type="number"
                  required
                  value={form.columns}
                  onChange={(e) => setForm({ ...form, columns: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Column Break</label>
                <input
                  type="number"
                  required
                  value={form.columnBreak}
                  onChange={(e) => setForm({ ...form, columnBreak: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bench Numbering</label>
              <select
                value={form.numberingStyle}
                onChange={(e) => setForm({ ...form, numberingStyle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="SERPENTINE">Serpentine (Default)</option>
                <option value="STRAIGHT">Straight</option>
              </select>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
              Strength: <strong>{Number(form.columns || 0) * Number(form.columnBreak || 0)}</strong> benches
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
            >
              {loading ? "Saving..." : "Save Block"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
