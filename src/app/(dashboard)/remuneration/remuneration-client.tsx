"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, Save, IndianRupee } from "lucide-react";

export function RemunerationClient({
  initialData,
}: {
  initialData: {
    instituteName: string;
    sessionName: string;
    rateMap: Record<string, number>;
    bills: Array<{
      staffId: string;
      name: string;
      department: string;
      designation: string;
      junior: number;
      reliever: number;
      senior: number;
      totalDuties: number;
      totalInr: number;
    }>;
  };
}) {
  const router = useRouter();
  const [rates, setRates] = useState(initialData.rateMap);
  const [busy, setBusy] = useState(false);

  const grandTotal = initialData.bills.reduce((acc, b) => acc + b.totalInr, 0);

  const saveRates = async () => {
    setBusy(true);
    try {
      await fetch("/api/remuneration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rates: Object.entries(rates).map(([role, ratePerDuty]) => ({ role, ratePerDuty })),
        }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Remuneration Bills</h1>
          <p className="text-sm text-slate-600">
            {initialData.instituteName} · {initialData.sessionName} · Grand Total:{" "}
            <strong>₹{grandTotal.toLocaleString("en-IN")}</strong>
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg"
        >
          <Printer className="w-3.5 h-3.5" /> Print Payment Bill
        </button>
      </div>

      {/* Rate Config */}
      <div className="print:hidden bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
          <IndianRupee className="w-3.5 h-3.5" /> Configure Per-Duty Rates (INR)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["JUNIOR", "RELIEVER", "SENIOR", "INTERNAL_PR", "EXTERNAL_PR"].map((role) => (
            <div key={role}>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">{role}</label>
              <input
                type="number"
                value={rates[role] ?? 150}
                onChange={(e) => setRates({ ...rates, [role]: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs border rounded-lg"
              />
            </div>
          ))}
        </div>
        <button
          onClick={saveRates}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
        >
          <Save className="w-3.5 h-3.5" /> Save Rates & Recalculate
        </button>
      </div>

      {/* Printable Bill Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5">Staff Name</th>
              <th className="px-4 py-2.5">Dept</th>
              <th className="px-4 py-2.5 text-center">Junior</th>
              <th className="px-4 py-2.5 text-center">Reliever</th>
              <th className="px-4 py-2.5 text-center">Senior</th>
              <th className="px-4 py-2.5 text-center">Total Duties</th>
              <th className="px-4 py-2.5 text-right">Amount Payable (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialData.bills.map((b) => (
              <tr key={b.staffId}>
                <td className="px-4 py-2 font-semibold">{b.name}</td>
                <td className="px-4 py-2">{b.department}</td>
                <td className="px-4 py-2 text-center">{b.junior}</td>
                <td className="px-4 py-2 text-center">{b.reliever}</td>
                <td className="px-4 py-2 text-center">{b.senior}</td>
                <td className="px-4 py-2 text-center font-medium">{b.totalDuties}</td>
                <td className="px-4 py-2 text-right font-bold">₹{b.totalInr.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
