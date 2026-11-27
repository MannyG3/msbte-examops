"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function TrialSignupPage() {
  const [form, setForm] = useState({
    instituteName: "",
    instituteCode: "",
    examCentreCode: "",
    region: "Pune",
    address: "",
    contactPerson: "",
    contactPhone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign-up failed");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-lg mb-3">
          <Building2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Start Your 30-Day ExamOps Trial</h1>
        <p className="mt-1 text-xs text-slate-400">
          Data hosted in India (ap-south-1 Mumbai) • Compliant with DPDP Act 2023
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-800/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-white">Trial Request Submitted!</h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Your institute workspace (<strong>{form.instituteName}</strong>, Centre{" "}
                <strong>{form.examCentreCode || form.instituteCode}</strong>) is pending founder approval.
                Once approved, you can sign in and complete the onboarding wizard.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-xs font-medium"
              >
                Back to Sign In <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Inst Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 0018"
                    value={form.instituteCode}
                    onChange={(e) => setForm({ ...form, instituteCode: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Exam Centre Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 1227"
                    value={form.examCentreCode}
                    onChange={(e) => setForm({ ...form, examCentreCode: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">MSBTE Region *</label>
                  <select
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  >
                    <option value="Pune">Pune</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Nagpur">Nagpur</option>
                    <option value="Chh. Sambhaji Nagar">Chh. Sambhaji Nagar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Polytechnic / Institute Name *</label>
                <input
                  type="text"
                  required
                  placeholder="K.E. Society's Rajarambapu Institute of Technology (Polytechnic)"
                  value={form.instituteName}
                  onChange={(e) => setForm({ ...form, instituteName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Contact Person (OIC / Admin) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Prof. S. R. Kulkarni"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9822000000"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="examcell@institute.ac.in"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Trial Request"}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-xs text-slate-400">
                Already approved?{" "}
                <Link href="/login" className="text-blue-400 hover:underline">
                  Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
