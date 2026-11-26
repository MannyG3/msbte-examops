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
  UserCheck,
  FileSpreadsheet,
  Grid,
  ShieldCheck,
  FlaskConical,
  Award,
  History,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";

interface SidebarProps {
  userRole: string;
}

export function AppSidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const isCoordinator = userRole === "COORDINATOR";
  const isPrincipal = userRole === "PRINCIPAL";
  const isHOD = userRole === "HOD";

  const navigation = [
    {
      label: "General",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Exam Sessions", href: "/sessions", icon: CalendarDays },
      ],
    },
    {
      label: "Masters (Milestone 1)",
      items: [
        { name: "Institute Profile", href: "/masters/institute", icon: Building2 },
        { name: "Programmes", href: "/masters/programmes", icon: BookOpen },
        { name: "Courses & Heads", href: "/masters/courses", icon: FileSpreadsheet },
        { name: "Rooms & Benches", href: "/masters/rooms", icon: DoorOpen },
        { name: "Staff Directory", href: "/masters/staff", icon: Users },
        { name: "Student Roster", href: "/masters/students", icon: UserCheck },
      ],
    },
    {
      label: "Theory Exam Ops (M2)",
      items: [
        { name: "Timetable Import", href: "/theory/timetable", icon: Clock },
        { name: "Paper Headcounts", href: "/theory/paper-mapping", icon: FileText },
        { name: "Seating Generator", href: "/theory/seating", icon: Grid },
        { name: "Door Charts & Notices", href: "/theory/print/door-chart", icon: FileText },
      ],
    },
    {
      label: "Supervision (M3)",
      items: [
        { name: "Fair Duty Allocation", href: "/supervision/allocate", icon: ShieldCheck },
        { name: "Duty Matrix Chart", href: "/supervision/chart", icon: Grid },
        { name: "My Duties & Swap", href: "/supervision/my-duties", icon: Users },
        { name: "Exam Day Console", href: "/supervision/exam-day", icon: Sparkles },
      ],
    },
    {
      label: "Practicals & CTs (M4-5)",
      items: [
        { name: "Practical Planner", href: "/practicals/planner", icon: FlaskConical },
        { name: "External Examiners", href: "/practicals/examiners", icon: Users },
        { name: "Class Test Marks", href: "/class-tests/marks", icon: FileSpreadsheet },
        { name: "Detention Engine", href: "/eligibility/detention", icon: ShieldCheck },
      ],
    },
    {
      label: "System",
      items: [
        { name: "Results & Analytics", href: "/results/analytics", icon: Award },
        { name: "Audit Trail", href: "/settings/audit-logs", icon: History },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
        <div className="p-2 bg-blue-600 rounded-xl shadow-md shadow-blue-500/20">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-base tracking-tight flex items-center gap-1.5">
            ExamOps
            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold px-1.5 py-0.2 rounded">
              MSBTE
            </span>
          </div>
          <div className="text-[11px] text-slate-400">Exam Cell Operations</div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navigation.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 mb-1.5">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
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
