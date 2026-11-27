import { requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function SuperAdminPlansPage() {
  await requireSuperAdmin();
  const plans = await prisma.plan.findMany({
    include: { _count: { select: { institutes: true } } },
    orderBy: { priceInr: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">SaaS Plans & Limits</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Subscription tiers for MSBTE diploma polytechnic exam centres
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{p.name}</h2>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                {p._count.institutes} tenants
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              ₹{p.priceInr.toLocaleString("en-IN")}{" "}
              <span className="text-xs font-normal text-slate-500">/ year</span>
            </div>
            <div className="text-xs text-slate-600">
              Max Candidates / Session: <strong>{p.maxCandidatesPerSession}</strong>
            </div>
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
              {(Array.isArray(p.modulesEnabled) ? (p.modulesEnabled as string[]) : []).map((m) => (
                <span
                  key={m}
                  className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
