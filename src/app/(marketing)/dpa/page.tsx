import Link from "next/link";

export default function DpaPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-sm text-slate-700">
        <h1 className="text-2xl font-bold text-slate-900">
          Data Processing Agreement (DPDP Act 2023 & Rules 2025)
        </h1>
        <p className="text-xs text-slate-500">Data Residency: India (Mumbai — ap-south-1 / bom1)</p>
        <p>
          <strong>1. Roles:</strong> Under the Digital Personal Data Protection Act, 2023, the subscribing
          MSBTE-affiliated Polytechnic Institute is the <strong>Data Fiduciary</strong>, and{" "}
          <strong>ExamOps</strong> is the <strong>Data Processor</strong>.
        </p>
        <p>
          <strong>2. Data Minimisation:</strong> ExamOps stores only fields required for examination centre
          operations (seat numbers, optional candidate names, course codes, staff duties). No Aadhaar numbers,
          caste categories, or photographs are collected.
        </p>
        <p>
          <strong>3. Security & Isolation:</strong> Every tenant row is isolated using PostgreSQL Row-Level
          Security (RLS) on <code>instituteId</code>, encrypted at rest and in transit (TLS).
        </p>
        <p>
          <strong>4. Retention & Deletion:</strong> Candidate-level records are auto-purged per the institute&apos;s
          configured retention period (default 12 months after session lock), with 1-click Excel/JSON export
          and full tenant deletion on request.
        </p>
        <div className="pt-4">
          <Link href="/login" className="text-blue-600 hover:underline text-xs font-medium">
            ← Back to ExamOps
          </Link>
        </div>
      </div>
    </div>
  );
}
