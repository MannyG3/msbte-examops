"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Grid, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function OnboardingWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    examCentreCode: "",
    principalName: "",
    address: "",
    blockCount: 10,
    columns: 4,
    columnBreak: 9,
    numberingStyle: "SERPENTINE",
    sessionName: "Winter-2026",
    sessionCode: "W26",
    theoryStartDate: "2026-11-17",
    theoryEndDate: "2026-12-09",
    dpaAccepted: false,
  });
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!form.dpaAccepted) {
      alert("Please accept the DPDP Act 2023 Data Processing Agreement.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        alert(data.error || "Failed to complete onboarding");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Exam Centre Onboarding Wizard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure your centre code, seating blocks, and DPDP compliance in 3 quick steps
          </p>
        </div>

        <div className="flex justify-center gap-3 text-xs font-semibold">
          <span className={`px-3 py-1 rounded-full ${step === 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"}`}>
            1. Centre Profile
          </span>
          <span className={`px-3 py-1 rounded-full ${step === 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"}`}>
            2. Bulk Blocks
          </span>
          <span className={`px-3 py-1 rounded-full ${step === 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"}`}>
            3. Session & DPA
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Building2 className="w-4 h-4 text-blue-600" /> Institute & Exam Centre Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Centre Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 1227"
                    value={form.examCentreCode}
                    onChange={(e) => setForm({ ...form, examCentreCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Principal Name</label>
                  <input
                    type="text"
                    placeholder="Dr. V. M. Mohitkar"
                    value={form.principalName}
                    onChange={(e) => setForm({ ...form, principalName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Address</label>
                <input
                  type="text"
                  placeholder="Pune, Maharashtra"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium"
                >
                  Next: Bulk Blocks <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Grid className="w-4 h-4 text-blue-600" /> Bulk Add Seating Blocks
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blocks</label>
                  <input
                    type="number"
                    value={form.blockCount}
                    onChange={(e) => setForm({ ...form, blockCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Columns</label>
                  <input
                    type="number"
                    value={form.columns}
                    onChange={(e) => setForm({ ...form, columns: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Column Break</label>
                  <input
                    type="number"
                    value={form.columnBreak}
                    onChange={(e) => setForm({ ...form, columnBreak: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Numbering</label>
                  <select
                    value={form.numberingStyle}
                    onChange={(e) => setForm({ ...form, numberingStyle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="SERPENTINE">Serpentine (MSBTE Default)</option>
                    <option value="STRAIGHT">Straight</option>
                  </select>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                Block Strength: <strong>{form.columns * form.columnBreak}</strong> candidates per block (
                {form.blockCount * form.columns * form.columnBreak} total centre capacity).
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs">
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium"
                >
                  Next: Session & DPA <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> First Exam Session & DPDP Compliance
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Session Name</label>
                  <input
                    type="text"
                    value={form.sessionName}
                    onChange={(e) => setForm({ ...form, sessionName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Session Code</label>
                  <input
                    type="text"
                    value={form.sessionCode}
                    onChange={(e) => setForm({ ...form, sessionCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
                <div className="font-bold text-slate-900">India DPDP Act 2023 & Rules 2025</div>
                <p>
                  Your institute acts as the <strong>Data Fiduciary</strong> and ExamOps acts as the{" "}
                  <strong>Data Processor</strong>. All data is hosted in India (ap-south-1 Mumbai / bom1).
                </p>
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.dpaAccepted}
                    onChange={(e) => setForm({ ...form, dpaAccepted: e.target.checked })}
                    className="mt-0.5 rounded text-blue-600"
                  />
                  <span>
                    I accept the{" "}
                    <Link href="/dpa" target="_blank" className="text-blue-600 underline">
                      Data Processing Agreement (DPA)
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" className="text-blue-600 underline">
                      Privacy Notice
                    </Link>
                    .
                  </span>
                </label>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs">
                  Back
                </button>
                <button
                  disabled={loading}
                  onClick={handleFinish}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-xs font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {loading ? "Saving..." : "Complete Onboarding"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
