import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import Link from "next/link";
import {
  Building2,
  DoorOpen,
  Users,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  ShieldCheck,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await requireTenantAuth();

  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const [institute, blockCount, staffCount, subjectCount, candidateCount, activeSession] =
      await Promise.all([
        tx.institute.findUnique({ where: { id: session.instituteId }, include: { plan: true } }),
        tx.block.count({ where: { instituteId: session.instituteId } }),
        tx.staff.count({ where: { instituteId: session.instituteId } }),
        tx.subject.count({ where: { instituteId: session.instituteId } }),
        tx.candidate.count({ where: { instituteId: session.instituteId } }),
        tx.examSession.findFirst({
          where: { instituteId: session.instituteId },
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: { timetableEntries: true, blockAllocations: true, supervisionDuties: true },
            },
          },
        }),
      ]);

    return { institute, blockCount, staffCount, subjectCount, candidateCount, activeSession };
  });

  const checklist = [
    {
      label: "Institute profile & DPA accepted",
      done: Boolean(data.institute?.dpaAcceptedAt),
      href: "/onboarding",
    },
    {
      label: "Blocks configured (columns × column break)",
      done: data.blockCount > 0,
      href: "/masters/rooms-blocks",
    },
    {
      label: "Staff master populated",
      done: data.staffCount > 0,
      href: "/masters/staff",
    },
    {
      label: "MSBTE Timetable & Seating imported",
      done: (data.activeSession?._count.timetableEntries || 0) > 0,
      href: "/imports",
    },
    {
      label: "Bench arrangements generated",
      done: (data.activeSession?._count.blockAllocations || 0) > 0,
      href: "/bench-arrangement",
    },
    {
      label: "Supervisors allotted",
      done: (data.activeSession?._count.supervisionDuties || 0) > 0,
      href: "/supervision/allocate",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            Centre Code: {data.institute?.examCentreCode || "—"}
          </span>
          <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            Plan: {data.institute?.plan?.name || "Trial"} ({data.institute?.status})
          </span>
          <span className="bg-slate-700/60 text-slate-200 px-2.5 py-0.5 rounded-full text-xs font-mono">
            India (ap-south-1 / bom1)
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{data.institute?.name}</h1>
        <p className="text-blue-200/80 text-xs mt-1">
          Welcome, {session.name} ({session.role}). Active Session:{" "}
          <strong>{data.activeSession?.name || "No session yet"}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Seating Blocks</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{data.blockCount}</div>
          </div>
          <DoorOpen className="w-7 h-7 text-blue-600" />
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Staff Pool</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{data.staffCount}</div>
          </div>
          <Users className="w-7 h-7 text-indigo-600" />
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Subjects (K/I)</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{data.subjectCount}</div>
          </div>
          <BookOpen className="w-7 h-7 text-amber-600" />
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Candidates</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{data.candidateCount}</div>
          </div>
          <Calendar className="w-7 h-7 text-emerald-600" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" /> Exam Centre Readiness Checklist
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checklist.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="p-3 rounded-lg border border-slate-200 hover:border-blue-300 flex items-center gap-3 text-xs transition"
            >
              {c.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
              <span className={c.done ? "font-semibold text-slate-800" : "text-slate-600"}>
                {c.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
