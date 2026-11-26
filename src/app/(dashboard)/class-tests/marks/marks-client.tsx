"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Download, Calendar, AlertTriangle, CheckCircle2, ClipboardPaste } from "lucide-react";

export function CtMarksClient({
  activeSession,
  courses,
  divisions,
  classTests,
  initialCourseId,
  initialDivisionId,
}: {
  activeSession: any;
  courses: any[];
  divisions: any[];
  classTests: any[];
  initialCourseId?: string;
  initialDivisionId?: string;
}) {
  const router = useRouter();
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || courses[0]?.id || "");
  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  const matchingDivisions = divisions.filter(
    (d) => !currentCourse || d.semester === currentCourse.semester
  );

  const [selectedDivisionId, setSelectedDivisionId] = useState(
    initialDivisionId || matchingDivisions[0]?.id || divisions[0]?.id || ""
  );
  const currentDivision =
    divisions.find((d) => d.id === selectedDivisionId) || matchingDivisions[0];

  const faThHead = currentCourse?.assessmentHeads?.[0];
  const maxMarks = faThHead?.maxMarks || 30;
  const minMarks = faThHead?.minMarks || 10;

  const ct1Obj = classTests.find(
    (ct) => ct.courseId === selectedCourseId && ct.divisionId === currentDivision?.id && ct.testNumber === 1
  );
  const ct2Obj = classTests.find(
    (ct) => ct.courseId === selectedCourseId && ct.divisionId === currentDivision?.id && ct.testNumber === 2
  );

  const students = currentDivision?.students || [];

  // State keyed by `${courseId}_${studentId}`
  const [grid, setGrid] = useState<Record<string, { ct1: string; ct2: string }>>(() => {
    const init: Record<string, { ct1: string; ct2: string }> = {};
    divisions.forEach((div) => {
      div.students?.forEach((st: any) => {
        courses.forEach((c) => {
          const head = c.assessmentHeads?.[0];
          if (!head) return;
          const c1 = classTests.find((ct) => ct.courseId === c.id && ct.divisionId === div.id && ct.testNumber === 1);
          const c2 = classTests.find((ct) => ct.courseId === c.id && ct.divisionId === div.id && ct.testNumber === 2);

          const m1 = c1 ? st.marks?.find((m: any) => m.assessmentHeadId === head.id && m.classTestId === c1.id) : null;
          const m2 = c2 ? st.marks?.find((m: any) => m.assessmentHeadId === head.id && m.classTestId === c2.id) : null;

          init[`${c.id}_${st.id}`] = {
            ct1: m1 ? (m1.status === "ABSENT" ? "AB" : String(m1.marksObtained)) : "",
            ct2: m2 ? (m2.status === "ABSENT" ? "AB" : String(m2.marksObtained)) : "",
          };
        });
      });
    });
    return init;
  });

  const [loading, setLoading] = useState(false);

  const handleCellChange = (studentId: string, field: "ct1" | "ct2", value: string) => {
    const clean = value.toUpperCase().trim();
    if (clean !== "" && clean !== "AB" && clean !== "A") {
      const num = parseFloat(clean);
      if (!isNaN(num) && num > maxMarks) return; // Validate against maxMarks (30)
    }
    const key = `${selectedCourseId}_${studentId}`;
    setGrid((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { ct1: "", ct2: "" }), [field]: clean },
    }));
  };

  // Excel Paste support
  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startIdx: number,
    startField: "ct1" | "ct2"
  ) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n") && !text.includes("\t")) return;
    e.preventDefault();

    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    setGrid((prev) => {
      const next = { ...prev };
      lines.forEach((line, offset) => {
        const st = students[startIdx + offset];
        if (!st) return;
        const cols = line.split("\t");
        const key = `${selectedCourseId}_${st.id}`;
        const existing = next[key] || { ct1: "", ct2: "" };
        if (cols.length >= 2 && startField === "ct1") {
          next[key] = { ct1: cols[0].trim().toUpperCase(), ct2: cols[1].trim().toUpperCase() };
        } else {
          next[key] = { ...existing, [startField]: cols[0].trim().toUpperCase() };
        }
      });
      return next;
    });
  };

  // Keyboard vertical navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, field: "ct1" | "ct2") => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = document.getElementById(`cell-${idx + 1}-${field}`);
      nextInput?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = document.getElementById(`cell-${idx - 1}-${field}`);
      prevInput?.focus();
    }
  };

  const computeAverage = (ct1Str: string, ct2Str: string) => {
    const isAb1 = ct1Str === "AB" || ct1Str === "A";
    const isAb2 = ct2Str === "AB" || ct2Str === "A";
    if (ct1Str === "" && ct2Str === "") return null;
    const v1 = isAb1 || ct1Str === "" ? 0 : parseFloat(ct1Str) || 0;
    const v2 = isAb2 || ct2Str === "" ? 0 : parseFloat(ct2Str) || 0;
    return Math.ceil((v1 + v2) / 2);
  };

  const handleSave = async () => {
    if (!faThHead || !currentDivision) return;
    setLoading(true);
    const rows = students.map((st: any) => {
      const val = grid[`${selectedCourseId}_${st.id}`] || { ct1: "", ct2: "" };
      const ct1Absent = val.ct1 === "AB" || val.ct1 === "A";
      const ct2Absent = val.ct2 === "AB" || val.ct2 === "A";
      return {
        studentId: st.id,
        ct1: val.ct1,
        ct2: val.ct2,
        ct1Absent,
        ct2Absent,
        faAvg: computeAverage(val.ct1, val.ct2),
      };
    });

    try {
      const res = await fetch("/api/class-tests/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          courseId: selectedCourseId,
          divisionId: currentDivision.id,
          assessmentHeadId: faThHead.id,
          maxMarks,
          rows,
        }),
      });
      if (res.ok) {
        alert("Class Test marks & FA-TH averages saved!");
        router.refresh();
      } else {
        alert("Failed to save marks");
      }
    } finally {
      setLoading(false);
    }
  };

  const exportPortalCSV = () => {
    const header = "Enrollment_No,Seat_No,Roll_No,Student_Name,CT1_30,CT2_30,FA_TH_Average_30\n";
    const body = students
      .map((st: any) => {
        const val = grid[`${selectedCourseId}_${st.id}`] || { ct1: "", ct2: "" };
        const avg = computeAverage(val.ct1, val.ct2);
        return `${st.enrollmentNo},${st.seatNo || ""},${st.rollNo},"${st.name}",${val.ct1 || 0},${val.ct2 || 0},${avg ?? 0}`;
      })
      .join("\n");

    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FA_TH_${currentCourse?.code}_Sem${currentCourse?.semester}_Div${currentDivision?.name}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Class Tests (FA-TH) Marks Grid & Averaging
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Keyboard-friendly grid (Enter/Arrows), paste directly from Excel, type AB for absent
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/class-tests/schedule"
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" /> CT Schedule
          </Link>
          <button
            onClick={exportPortalCSV}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Portal CSV
          </button>
          <button
            disabled={loading}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> {loading ? "Saving..." : "Save Marks"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Course (Theory)</label>
          <select
            value={selectedCourseId}
            onChange={(e) => {
              const cId = e.target.value;
              setSelectedCourseId(cId);
              const c = courses.find((x) => x.id === cId);
              const firstDiv = divisions.find((d) => d.semester === c?.semester);
              if (firstDiv) setSelectedDivisionId(firstDiv.id);
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                Sem {c.semester} | {c.code} - {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Division</label>
          <select
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
          >
            {matchingDivisions.map((d) => (
              <option key={d.id} value={d.id}>
                Sem {d.semester} - Div {d.name} ({d.students?.length || 0} students)
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs bg-blue-50/70 border border-blue-200 p-2.5 rounded-lg flex items-center gap-2 text-blue-900">
          <ClipboardPaste className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Excel Paste Ready:</strong> Copy 2 columns (CT1, CT2) and Ctrl+V into any CT1 cell. Max: {maxMarks}, Min: {minMarks}.
          </span>
        </div>
      </div>

      {/* Dense Marks Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
            <tr>
              <th className="py-2.5 px-4">Roll No</th>
              <th className="py-2.5 px-4">Enrollment No</th>
              <th className="py-2.5 px-4">Student Name</th>
              <th className="py-2.5 px-4 w-28">CT 1 (/{maxMarks})</th>
              <th className="py-2.5 px-4 w-28">CT 2 (/{maxMarks})</th>
              <th className="py-2.5 px-4 text-center">FA-TH Avg</th>
              <th className="py-2.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((st: any, idx: number) => {
              const val = grid[`${selectedCourseId}_${st.id}`] || { ct1: "", ct2: "" };
              const avg = computeAverage(val.ct1, val.ct2);
              const isBelowMin = avg !== null && avg < minMarks;
              const isAbsentBoth = (val.ct1 === "AB" || val.ct1 === "A") && (val.ct2 === "AB" || val.ct2 === "A");

              return (
                <tr key={st.id} className={isBelowMin ? "bg-amber-50/50" : "hover:bg-slate-50"}>
                  <td className="py-1.5 px-4 font-mono font-bold text-slate-800">{st.rollNo}</td>
                  <td className="py-1.5 px-4 font-mono text-slate-500">{st.enrollmentNo}</td>
                  <td className="py-1.5 px-4 font-medium text-slate-900">{st.name}</td>
                  <td className="py-1.5 px-4">
                    <input
                      id={`cell-${idx}-ct1`}
                      type="text"
                      value={val.ct1}
                      onChange={(e) => handleCellChange(st.id, "ct1", e.target.value)}
                      onPaste={(e) => handlePaste(e, idx, "ct1")}
                      onKeyDown={(e) => handleKeyDown(e, idx, "ct1")}
                      placeholder="0-30 / AB"
                      className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-1.5 px-4">
                    <input
                      id={`cell-${idx}-ct2`}
                      type="text"
                      value={val.ct2}
                      onChange={(e) => handleCellChange(st.id, "ct2", e.target.value)}
                      onPaste={(e) => handlePaste(e, idx, "ct2")}
                      onKeyDown={(e) => handleKeyDown(e, idx, "ct2")}
                      placeholder="0-30 / AB"
                      className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-1.5 px-4 text-center font-mono font-bold text-sm text-blue-800">
                    {avg !== null ? avg : "—"}
                  </td>
                  <td className="py-1.5 px-4">
                    {avg === null ? (
                      <span className="text-slate-400 text-[11px]">Pending</span>
                    ) : isAbsentBoth ? (
                      <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold text-[10px]">
                        ABSENT
                      </span>
                    ) : isBelowMin ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                        <AlertTriangle className="w-3 h-3" /> BELOW MIN (&lt;{minMarks})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> PASS
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
