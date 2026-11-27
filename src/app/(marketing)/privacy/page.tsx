import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-sm text-slate-700">
        <h1 className="text-2xl font-bold text-slate-900">ExamOps Privacy Notice</h1>
        <p className="text-xs text-slate-500">Compliant with India DPDP Act 2023 • Hosted in India</p>
        <p>
          ExamOps processes academic examination records solely on behalf of authorised polytechnic exam cells.
          All database backups and serverless compute run in Indian regions (Mumbai `ap-south-1` / `bom1`).
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
