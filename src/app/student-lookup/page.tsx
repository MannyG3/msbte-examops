"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, GraduationCap, MapPin } from "lucide-react";

export default function StudentLookupPage() {
  const [seatNo, setSeatNo] = useState("1999001");
  const [results, setResults] = useState<Array<{
    seatNo: string;
    csm: string;
    subjectCode: string;
    subjectName: string;
    examDay: number;
    examDate: string;
    slot: string;
    timeRange: string;
    blockNo: number;
    roomNo: string;
    benchNo: number;
  }> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/student-lookup?seatNo=${encodeURIComponent(seatNo)}`);
      const json = await res.json();
      setResults(json.results ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Student Exam Seat & Block Lookup</h1>
          </div>
          <Link href="/" className="text-xs font-semibold text-indigo-600 hover:underline">
            ← Home
          </Link>
        </div>

        <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-xl p-5 flex gap-3 shadow-sm">
          <input
            value={seatNo}
            onChange={(e) => setSeatNo(e.target.value)}
            placeholder="Enter MSBTE Seat Number (e.g. 1999001)"
            className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-lg font-mono"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold bg-slate-900 text-white rounded-lg"
          >
            <Search className="w-4 h-4" /> Find Seat
          </button>
        </form>

        {results !== null && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
                No bench allocations found for Seat No <strong>{seatNo}</strong>.
              </div>
            ) : (
              results.map((r, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {r.subjectCode} — {r.subjectName} ({r.csm})
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Day {r.examDay} · {r.examDate} · {r.slot} ({r.timeRange})
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-800 rounded-lg text-xs font-bold">
                      <MapPin className="w-3.5 h-3.5" /> Block {r.blockNo} ({r.roomNo})
                    </div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">Bench #{r.benchNo}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
