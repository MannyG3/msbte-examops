"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ArrowRight, AlertCircle, UserCheck } from "lucide-react";

export default function StudentPortalLoginPage() {
  const router = useRouter();
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [seatNoOrRollNo, setSeatNoOrRollNo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent, customEnroll?: string, customSeat?: string) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentNo: customEnroll || enrollmentNo,
          seatNoOrRollNo: customSeat || seatNoOrRollNo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      router.push("/portal/dashboard");
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const quickLogin = (enroll: string, seat: string) => {
    setEnrollmentNo(enroll);
    setSeatNoOrRollNo(seat);
    handleLogin(undefined, enroll, seat);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
          <GraduationCap className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">ExamOps Student Portal</h1>
        <p className="mt-1.5 text-xs text-slate-400">
          View your MSBTE timetable, practical batch slot, exam room, bench, and eligibility status
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                MSBTE Enrollment Number (10-Digit)
              </label>
              <input
                type="text"
                required
                value={enrollmentNo}
                onChange={(e) => setEnrollmentNo(e.target.value)}
                placeholder="e.g. 2400181001"
                className="mt-1 w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Seat Number or Roll Number
              </label>
              <input
                type="text"
                required
                value={seatNoOrRollNo}
                onChange={(e) => setSeatNoOrRollNo(e.target.value)}
                placeholder="e.g. 101001"
                className="mt-1 w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-md transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? "Checking Records..." : "View My Exam Schedule"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Students */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Quick Demo Student Lookup
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickLogin("2400181001", "101001")}
                className="p-2 bg-slate-900/70 hover:bg-slate-700/70 border border-slate-700 rounded-lg text-left"
              >
                <div className="font-semibold text-emerald-400">Sem 1 Student</div>
                <div className="text-[10px] font-mono text-slate-400">2400181001 / 101001</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin("2400185001", "501001")}
                className="p-2 bg-slate-900/70 hover:bg-slate-700/70 border border-slate-700 rounded-lg text-left"
              >
                <div className="font-semibold text-blue-400">Sem 5 Student</div>
                <div className="text-[10px] font-mono text-slate-400">2400185001 / 501001</div>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-400">
            Staff / Coordinator?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
