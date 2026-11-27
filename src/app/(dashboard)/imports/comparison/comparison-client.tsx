"use client";

import Link from "next/link";
import * as XLSX from "xlsx";
import { ArrowLeft, AlertTriangle, CheckCircle2, Download } from "lucide-react";

export function ComparisonClient({ entries }: { entries: any[] }) {
  const rows = entries.map((e) => {
    const qpCount = e.qpInventory?.qpCount ?? null;
    const seatingCount = e._count?.papers ?? 0;
    const diff = qpCount !== null ? qpCount - seatingCount : null;
    const isShortage = diff !== null && diff < 0;
    return {
      ...e,
      qpCount,
      seatingCount,
      diff,
      isShortage,
    };
  });

  const shortageCount = rows.filter((r) => r.isShortage).length;

  const handleExportExcel = () => {
    const exportData = rows.map((r) => ({
      Day: r.examDay,
      Date: new Date(r.examDate).toLocaleDateString("en-IN"),
      Slot: r.slot,
      "C-S-M": r.csm,
      "Subject Code": r.subject.code,
      "Subject Name": r.subject.name,
      "DC Code": r.qpInventory?.dcCode || "",
      "EC Code": r.qpInventory?.ecCode || "",
      "QP Inventory": r.qpCount ?? "Not Imported",
      "Seating Count": r.seatingCount,
      Difference: r.diff ?? "—",
      Status: r.isShortage ? `SHORTAGE (${Math.abs(r.diff)})` : r.qpCount === null ? "NO QP DATA" : "OK",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Count Comparison");
    XLSX.writeFile(wb, "ExamOps_Student_Count_Comparison.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/imports" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal Importers
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            Student Count Comparison (QP Inventory vs. Seating)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Flags any paper where portal QP inventory is lower than seating candidate count (late form confirmations)
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> Export Excel
        </button>
      </div>

      {shortageCount > 0 ? (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <strong>QP Shortage Alert:</strong> <strong>{shortageCount}</strong> paper(s) have fewer Question Papers
            in inventory than candidates in Seating Arrangement. Request extra QPs from your Distribution Centre (DC).
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>All imported papers have sufficient Question Paper inventory for seated candidates.</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Day / Slot</th>
                <th className="py-2.5 px-4">C-S-M</th>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4">DC / EC</th>
                <th className="py-2.5 px-4 text-center">QP Inventory</th>
                <th className="py-2.5 px-4 text-center">Seating Count</th>
                <th className="py-2.5 px-4 text-center">Diff</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className={r.isShortage ? "bg-rose-50/70" : "hover:bg-slate-50"}>
                  <td className="py-2.5 px-4 whitespace-nowrap font-mono">
                    Day {r.examDay} • {r.slot === "MORNING" ? "M" : "A"}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{r.csm}</td>
                  <td className="py-2.5 px-4">
                    <span className="font-mono font-bold text-blue-700 mr-1.5">{r.subject.code}</span>
                    <span className="font-medium text-slate-900">{r.subject.name}</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-500">
                    {r.qpInventory ? `${r.qpInventory.dcCode} / ${r.qpInventory.ecCode}` : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold">
                    {r.qpCount !== null ? r.qpCount : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold text-blue-700">
                    {r.seatingCount}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold">
                    {r.diff !== null ? (r.diff >= 0 ? `+${r.diff}` : r.diff) : "—"}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {r.isShortage ? (
                      <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded font-bold text-[10px]">
                        SHORT BY {Math.abs(r.diff)}
                      </span>
                    ) : r.qpCount === null ? (
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px]">
                        NO QP DATA
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px]">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
