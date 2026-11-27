"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2, Printer, ArrowLeft } from "lucide-react";

export function InvoicesClient({
  invoices,
  institutes,
}: {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    companyName: string;
    amountInr: number;
    gstInr: number;
    totalInr: number;
    status: string;
    issuedAt: string;
    paidAt: string | null;
    institute: { name: string; code: string };
  }>;
  institutes: Array<{ id: string; code: string; name: string }>;
}) {
  const router = useRouter();
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [amountInr, setAmountInr] = useState(15000);
  const [companyName, setCompanyName] = useState("ExamOps Technologies Pvt. Ltd.");
  const [notes, setNotes] = useState("Annual SaaS Subscription — MSBTE ExamOps");
  const [busy, setBusy] = useState(false);

  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/super-admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instituteId, amountInr, companyName, notes }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (invoiceId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/super-admin/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, status: "PAID" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/super-admin"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Super-Admin
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">B2B Invoices & GST Billing</h1>
            <p className="text-xs text-slate-500">Manual bank-transfer invoicing with 18% GST & printable PDF</p>
          </div>
        </div>
      </div>

      <form onSubmit={createInvoice} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Institute</label>
          <select
            value={instituteId}
            onChange={(e) => setInstituteId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          >
            {institutes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.code} — {i.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Base Amount (INR)</label>
          <input
            type="number"
            value={amountInr}
            onChange={(e) => setAmountInr(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Issuer Company</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" /> Issue Invoice
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Institute</th>
              <th className="px-4 py-3 text-right">Base (INR)</th>
              <th className="px-4 py-3 text-right">GST 18%</th>
              <th className="px-4 py-3 text-right">Total (INR)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="px-4 py-2.5 font-mono font-bold">{inv.invoiceNumber}</td>
                <td className="px-4 py-2.5">{inv.institute.code} — {inv.institute.name}</td>
                <td className="px-4 py-2.5 text-right">₹{inv.amountInr.toLocaleString("en-IN")}</td>
                <td className="px-4 py-2.5 text-right">₹{inv.gstInr.toLocaleString("en-IN")}</td>
                <td className="px-4 py-2.5 text-right font-bold">₹{inv.totalInr.toLocaleString("en-IN")}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${
                      inv.status === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right space-x-2">
                  {inv.status !== "PAID" && (
                    <button
                      onClick={() => markPaid(inv.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                    </button>
                  )}
                  <Link
                    href={`/super-admin/invoices/${inv.id}`}
                    className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline"
                  >
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
