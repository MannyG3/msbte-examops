"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Upload, Download, TrendingUp, AlertTriangle, Trophy } from "lucide-react";

export function AnalyticsClient({
  sessionCode,
  rows,
  students,
  courses,
}: {
  sessionCode: string;
  rows: any[];
  students: any[];
  courses: any[];
}) {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [showImporter, setShowImporter] = useState(rows.length === 0);
  const [loading, setLoading] = useState(false);

  const loadSampleResults = () => {
    setCsvText(
      `501001,2400185001,315319,SA_TH,64,70,PASS
501001,2400185001,315320,SA_TH,66,70,PASS
501002,2400185002,315319,SA_TH,52,70,PASS
501002,2400185002,315320,SA_TH,48,70,PASS
501003,2400185003,315319,SA_TH,22,70,FAIL
501003,2400185003,315320,SA_TH,38,70,PASS
301001,2400183001,313301,SA_TH,61,70,PASS
301002,2400183002,313301,SA_TH,19,70,FAIL`
    );
  };

  const handleImport = async () => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed = lines.map((l) => {
      const [seatNo, enrollmentNo, courseCode, headType, marksObtained, maxMarks, resultStatus] =
        l.split(/[\t,]+/);
      return { seatNo, enrollmentNo, courseCode, headType, marksObtained, maxMarks, resultStatus };
    });

    if (parsed.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/results/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: `${sessionCode}_msbte_results.csv`, rows: parsed }),
      });
      if (res.ok) {
        setCsvText("");
        setShowImporter(false);
        router.refresh();
      } else {
        alert("Failed to import result rows");
      }
    } finally {
      setLoading(false);
    }
  };

  // Compute Analytics
  const studentMap = new Map<string, { name: string; seatNo: string; obtained: number; max: number; failedCount: number }>();
  const courseMap = new Map<string, { code: string; title: string; total: number; pass: number; fail: number; totalMarks: number; maxMarks: number }>();

  rows.forEach((r) => {
    // Student aggregate
    if (!studentMap.has(r.seatNo)) {
      const st = students.find((s) => s.seatNo === r.seatNo || s.enrollmentNo === r.enrollmentNo);
      studentMap.set(r.seatNo, {
        name: st?.name || `Seat ${r.seatNo}`,
        seatNo: r.seatNo,
        obtained: 0,
        max: 0,
        failedCount: 0,
      });
    }
    const sAgg = studentMap.get(r.seatNo)!;
    sAgg.obtained += r.marksObtained;
    sAgg.max += r.maxMarks;
    if (r.resultStatus === "FAIL") sAgg.failedCount++;

    // Course aggregate
    if (!courseMap.has(r.courseCode)) {
      const c = courses.find((x) => x.code === r.courseCode);
      courseMap.set(r.courseCode, {
        code: r.courseCode,
        title: c?.title || r.courseCode,
        total: 0,
        pass: 0,
        fail: 0,
        totalMarks: 0,
        maxMarks: 0,
      });
    }
    const cAgg = courseMap.get(r.courseCode)!;
    cAgg.total++;
    if (r.resultStatus === "PASS") cAgg.pass++;
    else cAgg.fail++;
    cAgg.totalMarks += r.marksObtained;
    cAgg.maxMarks += r.maxMarks;
  });

  const studentList = Array.from(studentMap.values());
  const totalEvaluated = studentList.length;
  const totalPassed = studentList.filter((s) => s.failedCount === 0).length;
  const overallPassPct = totalEvaluated > 0 ? Math.round((totalPassed / totalEvaluated) * 100) : 0;

  const toppers = [...studentList]
    .filter((s) => s.failedCount === 0)
    .map((s) => ({ ...s, pct: s.max > 0 ? Math.round((s.obtained / s.max) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const courseStats = Array.from(courseMap.values()).map((c) => ({
    ...c,
    passPct: c.total > 0 ? Math.round((c.pass / c.total) * 100) : 0,
  }));

  const exportAccreditationCSV = () => {
    const header = "Course_Code,Course_Title,Students_Appeared,Students_Passed,Students_Failed,Pass_Percentage\n";
    const body = courseStats
      .map((c) => `${c.code},"${c.title}",${c.total},${c.pass},${c.fail},${c.passPct}%`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sessionCode}_NBA_Accreditation_Result_Summary.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Results Analysis & Accreditation ({sessionCode})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pass percentages, failure hotspots, toppers, and NBA/IQAC accreditation exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImporter(!showImporter)}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-medium"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" /> Import Result CSV
          </button>
          {courseStats.length > 0 && (
            <button
              onClick={exportAccreditationCSV}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export NBA Summary CSV
            </button>
          )}
        </div>
      </div>

      {/* Importer Panel */}
      {showImporter && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Import MSBTE Result Ledger CSV</h2>
            <button
              onClick={loadSampleResults}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Load Sample Result Rows
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Format: SeatNo, EnrollmentNo, CourseCode, HeadType, MarksObtained, MaxMarks, ResultStatus (PASS/FAIL)
          </p>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="501001,2400185001,315319,SA_TH,64,70,PASS"
            className="w-full px-3 py-2 font-mono text-xs bg-slate-900 text-slate-100 rounded-lg border border-slate-700"
          />
          <div className="flex justify-end">
            <button
              disabled={loading || !csvText.trim()}
              onClick={handleImport}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold"
            >
              {loading ? "Importing..." : "Process Result CSV"}
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Overall Pass %</div>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1">{overallPassPct}%</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalPassed} of {totalEvaluated} students cleared all heads
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Courses Analyzed</div>
          <div className="text-3xl font-extrabold text-blue-700 mt-1">{courseStats.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">{rows.length} total subject mark rows</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Students with ATKT/Fail</div>
          <div className="text-3xl font-extrabold text-rose-600 mt-1">
            {totalEvaluated - totalPassed}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Requires remedial / backlog registration</div>
        </div>
      </div>

      {/* Course Pass % & Toppers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" /> Course-Wise Pass Percentage & Failure Hotspots
          </h2>

          <div className="space-y-3">
            {courseStats.map((c) => (
              <div key={c.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-blue-700 mr-2">{c.code}</span>
                    <span className="font-semibold text-slate-800">{c.title}</span>
                  </div>
                  <div className="font-mono">
                    <strong className={c.passPct < 70 ? "text-rose-600" : "text-emerald-700"}>
                      {c.passPct}%
                    </strong>{" "}
                    <span className="text-slate-400">({c.pass}/{c.total})</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      c.passPct < 70 ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${c.passPct}%` }}
                  />
                </div>
              </div>
            ))}
            {courseStats.length === 0 && (
              <div className="text-xs text-slate-500 py-4 text-center">
                Import MSBTE result CSV to view course-wise analytics.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Institute Toppers
          </h2>
          <div className="divide-y divide-slate-100">
            {toppers.map((t, idx) => (
              <div key={t.seatNo} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">
                    #{idx + 1} {t.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">Seat: {t.seatNo}</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-blue-700 text-sm">{t.pct}%</div>
                  <div className="text-[10px] text-slate-400">
                    {t.obtained}/{t.max}
                  </div>
                </div>
              </div>
            ))}
            {toppers.length === 0 && (
              <div className="text-xs text-slate-500 py-4 text-center">No topper data yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
