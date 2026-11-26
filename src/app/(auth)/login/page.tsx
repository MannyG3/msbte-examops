"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, GraduationCap, Building2, KeyRound, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    const emailToUse = customEmail || email;
    const passwordToUse = customPassword || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse, password: passwordToUse }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("admin123");
    handleLogin(undefined, demoEmail, "admin123");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
          <GraduationCap className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">ExamOps</h1>
        <p className="mt-2 text-sm text-slate-400">
          MSBTE Polytechnic Examination Operations System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Staff Email
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coordinator@gp-pune.ac.in"
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in to Exam Cell"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-6 border-t border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Demo Institute (GP Pune - 0018) Instant Roles
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill("coordinator@gp-pune.ac.in")}
                className="p-2 text-left bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg text-slate-200 transition"
              >
                <div className="font-semibold text-blue-400">Coordinator</div>
                <div className="text-[10px] text-slate-400 truncate">Superuser per Inst.</div>
              </button>
              <button
                type="button"
                onClick={() => quickFill("principal@gp-pune.ac.in")}
                className="p-2 text-left bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg text-slate-200 transition"
              >
                <div className="font-semibold text-emerald-400">Principal</div>
                <div className="text-[10px] text-slate-400 truncate">Review & Sign-offs</div>
              </button>
              <button
                type="button"
                onClick={() => quickFill("hod.comp@gp-pune.ac.in")}
                className="p-2 text-left bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg text-slate-200 transition"
              >
                <div className="font-semibold text-amber-400">HOD</div>
                <div className="text-[10px] text-slate-400 truncate">Dept Practical & CT</div>
              </button>
              <button
                type="button"
                onClick={() => quickFill("faculty@gp-pune.ac.in")}
                className="p-2 text-left bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg text-slate-200 transition"
              >
                <div className="font-semibold text-purple-400">Faculty</div>
                <div className="text-[10px] text-slate-400 truncate">Duties & Marks Entry</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400 space-y-2">
            <div>
              Need to register a new polytechnic?{" "}
              <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                Onboard Institute
              </Link>
            </div>
            <div>
              Are you a student?{" "}
              <Link href="/portal/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Open Student Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
