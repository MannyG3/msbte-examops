"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Upload,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  Plus,
  Trash2,
} from "lucide-react";
import { parseSchemeString, parsePastedTimetable } from "@/lib/parsers/msbte-scheme-parser";

interface TimetableClientProps {
  activeSession: any;
}

export function TimetableClient({ activeSession }: TimetableClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"LIST" | "PASTE" | "UPLOAD">("LIST");
  const [pastedText, setPastedText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const sampleRows = `2026-11-26\tMorning\t315322\tClient Side Scripting\tCO-5-K
2026-11-26\tAfternoon\t313304\tComputer Graphics\tCO-3-K
2026-11-28\tMorning\t311305\tFundamentals of ICT\tCO-1-K`;

  const handlePasteChange = (text: string) => {
    setPastedText(text);
    const parsed = parsePastedTimetable(text);
    const enriched = parsed.map((row) => ({
      ...row,
      parsed: parseSchemeString(row.schemeString),
    }));
    setParsedPreview(enriched);
  };

  const loadSample = () => {
    handlePasteChange(sampleRows);
  };

  const handleImport = async () => {
    if (parsedPreview.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/theory/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          rows: parsedPreview,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Import failed");
        setLoading(false);
        return;
      }

      setPastedText("");
      setParsedPreview([]);
      setTab("LIST");
      router.refresh();
    } catch {
      alert("Failed to import timetable");
    } finally {
      setLoading(false);
    }
  };

  const papers = activeSession?.theoryPapers || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded border border-blue-200 font-mono">
              Session: {activeSession?.code || "W26"}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            MSBTE Theory Timetable & Scheme Parser
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Imports official timetable dates, morning/afternoon slots, and parses scheme strings (e.g. CO-5-K, EE-5-K)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("LIST")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              tab === "LIST"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Scheduled Papers ({papers.length})
          </button>
          <button
            onClick={() => setTab("PASTE")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              tab === "PASTE"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Paste Rows
          </button>
        </div>
      </div>

      {/* Tab: LIST */}
      {tab === "LIST" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Winter 2026 Scheduled Theory Papers ({papers.length})
            </div>
            <Link
              href="/theory/paper-mapping"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View Student Headcounts & Seating <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Exam Date & Day</th>
                  <th className="py-3 px-4">Session Slot</th>
                  <th className="py-3 px-4">Subject Code & Title</th>
                  <th className="py-3 px-4">Parsed Scheme String</th>
                  <th className="py-3 px-4 text-center">Appearing Students</th>
                  <th className="py-3 px-4 text-center">Seating Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {papers.map((paper: any) => {
                  const examDateFormatted = new Date(paper.examDate).toLocaleDateString("en-IN", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  const isMorning = paper.slot === "MORNING";
                  const studentCount = paper.course?._count?.studentCourses || 0;
                  const seatedCount = paper.seatingAllocations?.length || 0;

                  return (
                    <tr key={paper.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>{examDateFormatted}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                            isMorning
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                          }`}
                        >
                          {paper.slot} ({paper.startTime} – {paper.endTime})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {paper.paperCode}
                          </span>
                          <span className="font-bold text-slate-900">{paper.paperName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                            {paper.schemeString}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            (Prog: {paper.parsedProgramme}, Sem: {paper.parsedSemester}, Sch: {paper.parsedScheme})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs">
                          {studentCount} Students
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {seatedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> {seatedCount} Seated
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Not generated
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {papers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      No theory papers imported yet. Click "Paste Rows" above to import MSBTE timetable.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: PASTE */}
      {tab === "PASTE" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Paste MSBTE Timetable Rows
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste tab-separated or comma-separated rows directly from PDF notification or Excel
              </p>
            </div>
            <button
              onClick={loadSample}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
            >
              Load Sample MSBTE Rows
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Format: Date | Slot (Morning/Afternoon) | Subject Code | Subject Name | Scheme String (e.g. CO-5-K)
            </label>
            <textarea
              rows={5}
              value={pastedText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder={`2026-11-26\tMorning\t315322\tClient Side Scripting\tCO-5-K\n2026-11-26\tAfternoon\t313304\tComputer Graphics\tCO-3-K`}
              className="w-full px-3.5 py-2.5 font-mono text-xs bg-slate-900 text-slate-100 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Live Scheme Parser Preview */}
          {parsedPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Live Scheme String Parser Output ({parsedPreview.length} Papers detected)
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Slot</th>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">Subject Name</th>
                      <th className="py-2 px-3">Scheme String</th>
                      <th className="py-2 px-3">Parsed Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPreview.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono">{r.examDate}</td>
                        <td className="py-2 px-3">
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">
                            {r.slot}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">
                          {r.paperCode}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">{r.paperName}</td>
                        <td className="py-2 px-3 font-mono">{r.schemeString}</td>
                        <td className="py-2 px-3">
                          <span className="bg-emerald-50 text-emerald-800 font-semibold text-[10px] px-1.5 py-0.5 rounded border border-emerald-200">
                            Prog: {r.parsed.programme} • Sem: {r.parsed.semester} • Scheme: {r.parsed.scheme}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  disabled={loading}
                  onClick={handleImport}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-xs shadow-sm transition disabled:opacity-50"
                >
                  {loading ? "Importing Papers..." : `Import ${parsedPreview.length} Papers to Session`}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
