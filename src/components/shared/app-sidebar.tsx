"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  CalendarDays,
  Building2,
  BookOpen,
  DoorOpen,
  Users,
  Upload,
  Grid,
  ShieldCheck,
  FileText,
  Sparkles,
  History,
  Shield,
} from "lucide-react";

interface SidebarProps {
  userRole: string;
}

export function AppSidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      label: "Exam Centre",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Exam Sessions", href: "/sessions", icon: CalendarDays },
      ],
    },
    {
      label: "Masters (M2)",
      items: [
        { name: "Institute Profile", href: "/masters/institute", icon: Building2 },
        { name: "Rooms & Blocks", href: "/masters/rooms-blocks", icon: DoorOpen },
        { name: "Subjects & Schemes", href: "/masters/subjects", icon: BookOpen },
        { name: "Staff Master", href: "/masters/staff", icon: Users },
      ],
    },
    {
      label: "MSBTE Portals (M2)",
      items: [
        { name: "Portal Importers", href: "/imports", icon: Upload },
        { name: "Count Comparison", href: "/imports/comparison", icon: FileText },
      ],
    },
    {
      label: "Operations (M3–M5)",
      items: [
        { name: "Bench Arrangement", href: "/bench-arrangement", icon: Grid },
        { name: "Supervisor Duties", href: "/supervision/allocate", icon: ShieldCheck },
        { name: "Exam Day Console", href: "/exam-day", icon: Sparkles },
        { name: "Official Report Pack", href: "/reports", icon: FileText },
      ],
    },
    {
      label: "Governance & DPDP",
      items: [
        { name: "DPDP Compliance", href: "/compliance", icon: Shield },
        { name: "Audit Trail", href: "/settings/audit-logs", icon: History },
      ],
    },
    {
      label: "Section 7 Modules",
      items: [
        { name: "Practicals & Examiners", href: "/practicals/examiners", icon: CalendarDays },
        { name: "Class Tests (FA-TH)", href: "/class-tests", icon: BookOpen },
        { name: "Results Analysis", href: "/results", icon: Sparkles },
        { name: "Remuneration Bills", href: "/remuneration", icon: FileText },
        { name: "Student Seat Lookup", href: "/student-lookup", icon: Users },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 select-none">
      <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
        <div className="p-2 bg-blue-600 rounded-xl shadow-md shadow-blue-500/20">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-base tracking-tight flex items-center gap-1.5">
            ExamOps
            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold px-1.5 py-0.2 rounded">
              SaaS
            </span>
          </div>
          <div className="text-[11px] text-slate-400">{userRole}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navigation.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 mb-1.5">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/40"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? "text-white" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
