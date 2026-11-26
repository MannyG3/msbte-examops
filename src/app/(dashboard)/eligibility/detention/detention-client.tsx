"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Play,
  Upload,
  Printer,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export function DetentionClient({
  institute,
  rule,
  detainedStudents,
  totalStudents,
  attendanceCount,
}: {
  institute: any;
  rule: any;
  detainedStudents: any[];
  totalStudents: number;
  attendanceCount: number;
}) {
  const router = useRouter();
  const [minAttendancePct, setMinAttendancePct] = useState(rule?.minAttendancePct || 75);
  const [enforceFaPrPass, setEnforceFaPrPass] = useState(rule?.enforceFaPrPass !== false);
  const [attendanceCsv, setAttendanceCsv] = useState("");
  const [loading, setLoading] = useState(false);

  const loadSampleAttendance = () => {
    setAttendanceCsv(
      `2400185001,315319,62\n2400185002,315319,68\n2400183005,313301,71\n2400185010,315319,88`
    );
  };

  const handleImportAttendance = async () => {
    const lines = attendanceCsv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const rows = lines.map((l) => {
      const [enrollmentNo, courseCode, percentage] = l.split(/[\t,]+/);
      return { enrollmentNo, courseCode, percentage };
    });

    if (rows.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "IMPORT_ATTENDANCE", attendanceRows: rows }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Imported ${data.imported} attendance records.`);
        setAttendanceCsv("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RUN_RULES",
          minAttendancePct: Number(minAttendancePct),
          enforceFaPrPass,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Eligibility Engine evaluated all students. Detained count: ${data.detainedCount}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Eligibility & Detention Rules Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enforces MSBTE attendance thresholds ({minAttendancePct}%) and mandatory FA-PR passing criteria
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-medium shadow-xs"
        >
          <Printer className="w-3.5 h-3.5 text-blue-600" /> Print Detained List
        </button>
      </div>

      {/* Rules & Attendance Importer */}
      <div className="print:hidden grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rules Config */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">1. Eligibility Rules Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Min Attendance % Threshold
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={minAttendancePct}
                onChange={(e) => setMinAttendancePct(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enforceFaPrPass}
                  onChange={(e) => setEnforceFaPrPass(e.target.checked)}
                  className="rounded text-blue-600"
                />
                Enforce FA-PR Detention Rule
              </label>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Evaluates <strong>{totalStudents}</strong> students ({attendanceCount} attendance records)
            </span>
            <button
              disabled={loading}
              onClick={handleRunRules}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm"
            >
              <Play className="w-3.5 h-3.5" /> Run Eligibility Engine
            </button>
          </div>
        </div>

        {/* Attendance Importer */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">2. Import Course Attendance (%)</h2>
            <button
              onClick={loadSampleAttendance}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Load Sample Shortfall CSV
            </button>
          </div>

          <textarea
            rows={3}
            value={attendanceCsv}
            onChange={(e) => setAttendanceCsv(e.target.value)}
            placeholder="EnrollmentNo, CourseCode, AttendancePercentage (e.g. 2400185001,315319,62)"
            className="w-full px-3 py-2 font-mono text-xs bg-slate-900 text-slate-100 rounded-lg border border-slate-700"
          />

          <div className="flex justify-end">
            <button
              disabled={loading || !attendanceCsv.trim()}
              onClick={handleImportAttendance}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-medium"
            >
              <Upload className="w-3.5 h-3.5" /> Import Attendance
            </button>
          </div>
        </div>
      </div>

      {/* Printable Detention List */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
        <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4">
          <div className="text-xs font-bold uppercase text-slate-600">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION (MSBTE)
          </div>
          <h2 className="text-lg font-black uppercase">{institute?.name} ({institute?.code})</h2>
          <div className="text-sm font-bold">PROVISIONAL DETAINED / NOT-ELIGIBLE STUDENTS LIST</div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Detained / Not-Eligible Students ({detainedStudents.length})
          </h2>
          <span className="text-xs text-slate-500">
            Eligible Students: <strong>{totalStudents - detainedStudents.length}</strong> / {totalStudents}
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-4">Sem / Div</th>
                <th className="py-2.5 px-4">Roll No</th>
                <th className="py-2.5 px-4">Enrollment No</th>
                <th className="py-2.5 px-4">Student Name</th>
                <th className="py-2.5 px-4">Detention Reason(s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detainedStudents.map((st) => (
                <tr key={st.id} className="bg-rose-50/30">
                  <td className="py-2.5 px-4 font-semibold">
                    Sem {st.semester} • Div {st.division?.name || "A"}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{st.rollNo}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-700">{st.enrollmentNo}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{st.name}</td>
                  <td className="py-2.5 px-4 text-rose-700 font-medium">{st.detentionReason}</td>
                </tr>
              ))}

              {detainedStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    No students currently detained. All {totalStudents} students meet eligibility rules.
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
