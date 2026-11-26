import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  DoorOpen,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  Upload,
  Grid,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await requireAuth();

  const [studentCount, staffCount, roomStats, courseCount, activeSession] = await Promise.all([
    prisma.student.count({ where: { instituteId: session.instituteId } }),
    prisma.staff.count({ where: { instituteId: session.instituteId } }),
    prisma.room.aggregate({
      where: { instituteId: session.instituteId },
      _count: { id: true },
      _sum: { totalCapacity: true },
    }),
    prisma.course.count({
      where: { programme: { instituteId: session.instituteId } },
    }),
    prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
      include: {
        checklistItems: {
          orderBy: { dueDate: "asc" },
        },
      },
    }),
  ]);

  const completedChecklist = activeSession?.checklistItems.filter((i) => i.isCompleted).length || 0;
  const totalChecklist = activeSession?.checklistItems.length || 0;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Session Welcome */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-200 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>Active Session: {activeSession?.code || "No Session Active"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {session.instituteName}
          </h1>
          <p className="text-blue-200/80 text-sm mt-1 max-w-2xl">
            Welcome back, {session.name} ({session.role}). Exam cell control centre for MSBTE winter & summer session operations.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/masters/students/import"
              className="inline-flex items-center gap-2 bg-white text-blue-900 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium text-xs shadow-sm transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Student CSV
            </Link>
            <Link
              href="/theory/seating"
              className="inline-flex items-center gap-2 bg-blue-700/80 hover:bg-blue-600 text-white border border-blue-400/30 px-4 py-2 rounded-lg font-medium text-xs transition"
            >
              <Grid className="w-3.5 h-3.5" />
              Seating Generator
            </Link>
            <Link
              href="/supervision/chart"
              className="inline-flex items-center gap-2 bg-blue-700/80 hover:bg-blue-600 text-white border border-blue-400/30 px-4 py-2 rounded-lg font-medium text-xs transition"
            >
              <Users className="w-3.5 h-3.5" />
              Duty Allocation Chart
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Enrolled Students
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{studentCount}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Active across Sem 1, 3, 5
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Staff & Invigilators
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{staffCount}</div>
            <div className="text-[11px] text-blue-600 font-medium mt-1">
              Teaching & Technical pool
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Rooms & Capacity
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {roomStats._count.id} <span className="text-sm font-normal text-slate-500">Rooms</span>
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-1">
              {roomStats._sum.totalCapacity || 0} total bench capacity
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DoorOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Courses & Heads
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{courseCount}</div>
            <div className="text-[11px] text-amber-600 font-medium mt-1">
              K-Scheme & I-Scheme Backlog
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Session Timeline & Checklist Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Session Phases */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Session {activeSession?.code} Timeline & Key Milestones
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configured MSBTE examination windows
              </p>
            </div>
            <Link
              href="/sessions"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Session details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                Phase 1: Practicals
              </div>
              <div className="text-sm font-semibold text-slate-800">
                21 Oct – 31 Oct 2026
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Sem 1 Window: 02 Nov – 06 Nov
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
              </div>
            </div>

            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200">
              <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">
                Phase 2: Theory Exam
              </div>
              <div className="text-sm font-bold text-slate-900">
                17 Nov – 09 Dec 2026
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Slots: Morning (09:30) & Afternoon (02:00)
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded font-medium border border-blue-300">
                <Clock className="w-3.5 h-3.5" /> In Progress (Active)
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phase 3: Results
              </div>
              <div className="text-sm font-semibold text-slate-800">
                Expected 2nd Week Jan 2027
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                MSBTE Result portal import
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded font-medium">
                Upcoming
              </div>
            </div>
          </div>

          {/* Quick Notice about MSBTE Rules */}
          <div className="mt-5 p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <span className="font-semibold">MSBTE Rule Enforcement:</span> Formative Practical (FA-PR) failure detains student in current semester. Seating plan enforces alternate paper distribution on double benches.
            </div>
          </div>
        </div>

        {/* Right 1 Col: Session Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Session Checklist</h2>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {checklistPercent}% Done
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2.5">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-1">
            {activeSession?.checklistItems.map((item) => (
              <div
                key={item.id}
                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                  item.isCompleted
                    ? "bg-slate-50/60 border-slate-200/80 text-slate-500 line-through"
                    : "bg-white border-blue-200 text-slate-800 shadow-xs"
                }`}
              >
                <div className={`mt-0.5 ${item.isCompleted ? "text-emerald-500" : "text-slate-300"}`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Owner: {item.ownerName || "Exam Cell"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
