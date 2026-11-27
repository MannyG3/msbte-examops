"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Printer, Download, FileCode2, Users } from "lucide-react";

export function ReportsHubClient({
  initialData,
}: {
  initialData: {
    sessionName: string;
    daySlots: Array<{ examDay: number; examDate: string; slot: string }>;
    staff: Array<{ id: string; name: string; department: string }>;
  };
}) {
  const [selectedSlot, setSelectedSlot] = useState(
    initialData.daySlots[0] ? `${initialData.daySlots[0].examDay}:${initialData.daySlots[0].slot}` : "1:MORNING"
  );
  const [selectedStaffId, setSelectedStaffId] = useState(initialData.staff[0]?.id ?? "");

  const [day, slot] = selectedSlot.split(":");

  const preExamReports = [
    {
      title: "1. Bench Arrangement (Bulk Print)",
      desc: "Exact MSBTE A4 portrait serpentine block-by-block seating arrangement.",
      href: `/reports/bench-arrangement?day=${day}&slot=${slot}`,
      exportType: "bench",
    },
    {
      title: "2. Gate Chart",
      desc: "Notice-board seat range to block & room mapping grouped by paper.",
      href: `/reports/gate-chart?day=${day}&slot=${slot}`,
      exportType: "gate",
    },
    {
      title: "3. Attendance Report (Section I / II)",
      desc: "Per-block attendance sheet with Answer Book & Supplement serial columns.",
      href: `/reports/attendance?day=${day}&slot=${slot}`,
      exportType: "attendance",
    },
    {
      title: "4. Supervisor Report",
      desc: "Block-wise summary of allotted, present, absent, answer books & QPs.",
      href: `/reports/supervisor-report?day=${day}&slot=${slot}`,
    },
    {
      title: "5. Blank Present / Absent Report",
      desc: "Compact hand-marking sheet per block for exam-day invigilation.",
      href: `/reports/blank-absent?day=${day}&slot=${slot}`,
    },
    {
      title: "6. Supervisor Allocation Report",
      desc: "Slot-wise Senior, Junior & Reliever supervisor assignments.",
      href: `/reports/supervisor-allocation?day=${day}&slot=${slot}`,
      exportType: "supervisor-allocation",
    },
    {
      title: "7. Advanced QP Requirement",
      desc: "Paper-wise count of Question Papers needed per session from seating.",
      href: `/reports/qp-requirement?day=${day}&slot=${slot}`,
      exportType: "qp-requirement",
    },
  ];

  const templateFormats = [
    { key: "ANNEXURE_F", label: "Annexure F — Centre Readiness" },
    { key: "ANNEXURE_G", label: "Annexure G — QP Custody Log" },
    { key: "ANNEXURE_H", label: "Annexure H — Dispatch Summary" },
    { key: "FORMAT_03", label: "Format-03 — Candidate Undertaking" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Official MSBTE Report Pack</h1>
          <p className="text-sm text-slate-600">
            Session: <span className="font-semibold text-slate-800">{initialData.sessionName}</span> · Printable A4
            reports & Excel/CSV exports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600">Day & Slot:</label>
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            {initialData.daySlots.map((ds) => (
              <option key={`${ds.examDay}:${ds.slot}`} value={`${ds.examDay}:${ds.slot}`}>
                Day {ds.examDay} · {ds.examDate} · {ds.slot}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pre-Exam Reports Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Pre-Exam Reports (Day {day} · {slot})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {preExamReports.map((r) => (
            <div
              key={r.title}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  {r.title}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">{r.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={r.href}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  <Printer className="w-3.5 h-3.5" /> Open / Print
                </Link>
                {r.exportType && (
                  <a
                    href={`/api/reports/export?type=${r.exportType}&day=${day}&slot=${slot}`}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supervision Duty Chart & Individual Letters */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Users className="w-4 h-4 text-indigo-600" />
          Supervision Duty Chart & Individual Duty Letters
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/reports/duty-chart"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg"
          >
            <Printer className="w-3.5 h-3.5" /> Full-Session Duty Chart
          </Link>
          <a
            href="/api/reports/export?type=duty-chart"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" /> Export Duty Chart CSV
          </a>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {initialData.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.department})
                </option>
              ))}
            </select>
            {selectedStaffId && (
              <Link
                href={`/reports/duty-letter/${selectedStaffId}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
              >
                <Printer className="w-3.5 h-3.5" /> Duty Letter
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Template-Driven Formats */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Template-Driven MSBTE Formats (Editable HTML/CSS)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {templateFormats.map((tf) => (
            <Link
              key={tf.key}
              href={`/reports/templates/${tf.key}`}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-400 transition-colors flex items-center gap-3"
            >
              <FileCode2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <div className="text-xs font-semibold text-slate-800">{tf.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
