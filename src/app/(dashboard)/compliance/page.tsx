import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import Link from "next/link";
import { Shield, CheckCircle2 } from "lucide-react";

export default async function CompliancePage() {
  const session = await requireTenantAuth();

  const institute = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    return tx.institute.findUnique({ where: { id: session.instituteId } });
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">India DPDP Act 2023 Compliance</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Data residency, retention policy, DPA status, and tenant data governance
        </p>
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
              Auto-purge <strong>{institute?.retentionMonths || 12} months</strong> after session lock
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
