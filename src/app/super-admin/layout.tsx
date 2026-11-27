import { requireSuperAdmin } from "@/lib/tenant";
import Link from "next/link";
import { Shield, Building2, Layers, LogOut } from "lucide-react";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 text-white px-6 h-16 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-6">
          <Link href="/super-admin" className="flex items-center gap-2 font-bold text-base">
            <Shield className="w-5 h-5 text-amber-400" />
            <span>ExamOps Super-Admin</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
              ap-south-1 / bom1
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-300">
            <Link href="/super-admin" className="hover:text-white flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Tenants & Trials
            </Link>
            <Link href="/super-admin/plans" className="hover:text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Plans
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">{session.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
}
