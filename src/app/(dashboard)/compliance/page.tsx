import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import Link from "next/link";
import { Shield, CheckCircle2, Download, FileText, AlertCircle } from "lucide-react";

export default async function CompliancePage() {
  const session = await requireTenantAuth();

  const institute = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    return tx.institute.findUnique({ where: { id: session.instituteId } });
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">India DPDP Act 2023 Compliance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Data residency, retention policy, DPA status, and full tenant data portability
          </p>
        </div>
        <a
          href="/api/compliance/export"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >
          <Download className="w-3.5 h-3.5" /> Export All Institute Data (JSON)
        </a>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <Shield className="w-4 h-4 text-emerald-600" />
            Data Processing Agreement (DPA)
          </div>
          {institute?.dpaAcceptedAt ? (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Accepted on{" "}
              {new Date(institute.dpaAcceptedAt).toLocaleDateString("en-IN")}
            </span>
          ) : (
            <Link href="/onboarding" className="text-blue-600 underline font-semibold">
              Accept in Onboarding →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-bold text-slate-800">Data Residency</div>
            <div className="text-slate-600 mt-1">India — Mumbai (`ap-south-1` / Vercel `bom1`)</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-bold text-slate-800">Candidate Data Retention</div>
            <div className="text-slate-600 mt-1">
              Auto-purge <strong>{institute?.retentionMonths || 12} months</strong> after session lock (export before purge)
            </div>
          </div>
        </div>

        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1.5">
          <div className="font-bold text-amber-900 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Breach Notification & Data Minimisation Procedure
          </div>
          <p className="text-amber-800 leading-relaxed">
            ExamOps stores zero Aadhaar, caste category, or student photos. Every tenant table is isolated via PostgreSQL
            Row-Level Security (RLS). Any suspected incident is logged in the platform Incident Log and notified to the
            Data Protection Board of India and affected Institutes within 72 hours.
          </p>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <Link href="/dpa" className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline">
            <FileText className="w-3.5 h-3.5" /> View Full DPA
          </Link>
          <Link href="/privacy" className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline">
            <FileText className="w-3.5 h-3.5" /> Privacy Notice
          </Link>
        </div>
      </div>
    </div>
  );
}
