"use client";

import { useRouter } from "next/navigation";
import { Building2, Calendar, LogOut, Eye, AlertTriangle } from "lucide-react";

interface HeaderProps {
  instituteCode: string;
  examCentreCode?: string | null;
  instituteName: string;
  sessionCode?: string;
  sessionName?: string;
  userName: string;
  userRole: string;
  impersonatedByEmail?: string;
  isReadOnly?: boolean;
  daysUntilExpiry?: number | null;
}

export function AppHeader({
  instituteCode,
  examCentreCode,
  instituteName,
  sessionCode,
  sessionName,
  userName,
  userRole,
  impersonatedByEmail,
  isReadOnly,
  daysUntilExpiry,
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleExitImpersonation = async () => {
    const res = await fetch("/api/super-admin/impersonate", { method: "DELETE" });
    const data = await res.json();
    router.push(data.redirectTo || "/super-admin");
    router.refresh();
  };

  return (
    <div className="select-none">
      {/* Impersonation Banner */}
      {impersonatedByEmail && (
        <div className="bg-amber-500 text-slate-950 px-6 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>
              IMPERSONATING TENANT ({instituteName}) as {impersonatedByEmail} — All actions are audit-logged.
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="bg-slate-900 text-white px-3 py-1 rounded text-[11px] hover:bg-slate-800"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      {/* Expiry / Read-only Warning Banner */}
      {isReadOnly ? (
        <div className="bg-rose-600 text-white px-6 py-1.5 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Workspace Expired — Read-Only Mode active. Data is viewable and exportable; generation is locked.</span>
        </div>
      ) : daysUntilExpiry !== null && daysUntilExpiry !== undefined && daysUntilExpiry <= 15 ? (
        <div className="bg-amber-100 text-amber-900 border-b border-amber-300 px-6 py-1.5 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <span>Plan expires in {daysUntilExpiry} day(s). Contact ExamOps billing to renew.</span>
        </div>
      ) : null}

      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-slate-700">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 text-sm tracking-tight truncate max-w-[280px]">
                  {instituteName}
                </span>
                <span className="bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                  Inst: {instituteCode}
                </span>
                {examCentreCode && (
                  <span className="bg-blue-50 text-blue-700 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                    EC: {examCentreCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {sessionCode && (
            <div className="hidden md:flex items-center gap-1.5 pl-4 border-l border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200/80">
                {sessionCode} ({sessionName})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">{userName}</div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border bg-blue-50 text-blue-700 border-blue-200">
              {userRole}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
    </div>
  );
}
