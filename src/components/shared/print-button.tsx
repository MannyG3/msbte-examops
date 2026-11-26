"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print Document" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-sm transition"
    >
      <Printer className="w-4 h-4" />
      {label}
    </button>
  );
}
