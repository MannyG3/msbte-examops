"use client";

import { useRouter } from "next/navigation";
import { Building2, Calendar, LogOut, User, ShieldCheck } from "lucide-react";

interface HeaderProps {
  instituteCode: string;
  instituteName: string;
  sessionCode?: string;
  sessionName?: string;
  userName: string;
  userRole: string;
}

export function AppHeader({
  instituteCode,
  instituteName,
  sessionCode,
  sessionName,
  userName,
  userRole,
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const roleColors: Record<string, string> = {
    COORDINATOR: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    PRINCIPAL: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    HOD: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    FACULTY: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between select-none">
      {/* Left: Institute & Session context */}
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
                Code: {instituteCode}
              </span>
            </div>
          </div>
        </div>

        {sessionCode && (
          <div className="hidden md:flex items-center gap-1.5 pl-4 border-l border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-slate-600">Active Session:</span>
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200/80">
              {sessionCode} ({sessionName})
            </span>
          </div>
        )}
      </div>

      {/* Right: User Profile & Logout */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-semibold text-slate-800">{userName}</div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
              roleColors[userRole] || "bg-slate-100 text-slate-700"
            }`}
          >
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
  );
}
