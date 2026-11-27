import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import Link from "next/link";
import { Upload, Clock, FileSpreadsheet, Users, Award, ArrowRight, AlertTriangle } from "lucide-react";

export default async function ImportsHubPage() {
  const session = await requireTenantAuth();

  const templates = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    return tx.importTemplate.findMany({
      where: { instituteId: session.instituteId },
      orderBy: { createdAt: "desc" },
    });
  });

  const sources = [
    {
      title: "1. Exam Center-wise Time Table",
      desc: "Import Exam Day, Date, Slot (M/A), Time Range, Subject Code, Name, and C-S-M string.",
      href: "/imports/timetable",
      icon: Clock,
    },
    {
      title: "2. Question Paper Inventory",
      desc: "Import QP inventory from Upload Seating Arrangement (retains DC & EC codes).",
      href: "/imports/qp-inventory",
      icon: FileSpreadsheet,
    },
    {
      title: "3. Seating Arrangement / Candidates",
      desc: "Import paper-code-wise candidate list with Seat No, Inst Code, C-S-M & Detained status.",
      href: "/imports/seating",
      icon: Users,
    },
    {
      title: "4. Theory Marksheets Inventory",
      desc: "Import theory e-marksheet exam centre inventory report for post-exam tracking.",
      href: "/imports/marksheets",
      icon: Award,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">MSBTE Portal Data Importers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Paste or upload CSV/Excel exports from MSBTE portals with reusable column-mapping templates
          </p>
        </div>
        <Link
          href="/imports/comparison"
          className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-4 py-2 rounded-lg text-xs font-semibold"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Student Count Comparison (QP vs Seating)
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 transition flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{s.title}</h2>
                  <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Saved Column-Mapping Templates ({templates.length})
        </h2>
        {templates.length === 0 ? (
          <p className="text-xs text-slate-500">
            No saved templates yet. Save a template inside any importer above to reuse it every session.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {templates.map((t) => (
              <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{t.name}</div>
                <div className="text-[11px] font-mono text-blue-700 mt-0.5">{t.sourceType}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
