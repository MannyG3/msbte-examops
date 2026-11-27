"use client";

import Link from "next/link";
import { Printer, Download, ArrowLeft } from "lucide-react";

export function PrintToolbar({
  title,
  subtitle,
  exportUrl,
  backHref = "/reports",
}: {
  title: string;
  subtitle?: string;
  exportUrl?: string;
  backHref?: string;
}) {
  return (
    <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>
        <div>
          <h1 className="text-sm font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {exportUrl && (
          <a
            href={exportUrl}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel/CSV
          </a>
        )}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}
