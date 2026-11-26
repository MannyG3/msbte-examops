import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Calendar, Plus, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { logAuditAction } from "@/lib/audit";

export default async function SessionsPage() {
  const session = await requireAuth();

  const sessions = await prisma.examSession.findMany({
    where: { instituteId: session.instituteId },
    include: {
      _count: {
        select: {
          theoryPapers: true,
          checklistItems: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  async function createSession(formData: FormData) {
    "use server";
    const currentSession = await requireAuth();
    const code = (formData.get("code") as string).toUpperCase().trim();
    const name = formData.get("name") as string;
    const academicYear = formData.get("academicYear") as string;
    const practicalStartDate = new Date(formData.get("practicalStartDate") as string);
    const practicalEndDate = new Date(formData.get("practicalEndDate") as string);
    const theoryStartDate = new Date(formData.get("theoryStartDate") as string);
    const theoryEndDate = new Date(formData.get("theoryEndDate") as string);

    const newSession = await prisma.examSession.create({
      data: {
        instituteId: currentSession.instituteId,
        code,
        name,
        academicYear,
        practicalStartDate,
        practicalEndDate,
        theoryStartDate,
        theoryEndDate,
        isCurrent: true,
      },
    });

    // Mark previous sessions as non-current
    await prisma.examSession.updateMany({
      where: {
        instituteId: currentSession.instituteId,
        id: { not: newSession.id },
      },
      data: { isCurrent: false },
    });

    await logAuditAction({
      instituteId: currentSession.instituteId,
      userId: currentSession.userId,
      action: "CREATE_EXAM_SESSION",
      entity: "ExamSession",
      entityId: newSession.id,
      afterData: { code, name, academicYear },
    });

    revalidatePath("/sessions");
    revalidatePath("/dashboard");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">MSBTE Examination Sessions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Winter (Wxx) and Summer (Sxx) exam sessions with configurable phase windows
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sessions List */}
        <div className="lg:col-span-2 space-y-4">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-xl border p-5 shadow-xs transition ${
                s.isCurrent ? "border-blue-400 ring-1 ring-blue-400" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded border border-blue-200">
                      {s.code}
                    </span>
                    <Link
                      href={`/sessions/${s.id}`}
                      className="text-base font-bold text-slate-900 hover:text-blue-600 flex items-center gap-1.5"
                    >
                      {s.name} <ArrowRight className="w-4 h-4 text-blue-500" />
                    </Link>
                    {s.isCurrent && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active Session
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Academic Year: {s.academicYear}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800">
                    {s._count.theoryPapers} Papers Scheduled
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {s._count.checklistItems} checklist items
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-600">
                <div>
                  <div className="font-semibold text-slate-700">Practicals Window:</div>
                  <div className="text-slate-500">
                    {new Date(s.practicalStartDate).toLocaleDateString()} –{" "}
                    {new Date(s.practicalEndDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Theory Exam Window:</div>
                  <div className="text-slate-500">
                    {new Date(s.theoryStartDate).toLocaleDateString()} –{" "}
                    {new Date(s.theoryEndDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right 1 Col: Create Session Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Create Exam Session
          </h2>

          <form action={createSession} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Session Code (e.g. S27, W27) *
              </label>
              <input
                type="text"
                name="code"
                required
                maxLength={4}
                placeholder="S27"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Session Title *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Summer 2027 Examination"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Academic Year *
              </label>
              <input
                type="text"
                name="academicYear"
                required
                defaultValue="2026-2027"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Practical Start & End Dates
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  name="practicalStartDate"
                  required
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="date"
                  name="practicalEndDate"
                  required
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Theory Start & End Dates
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  name="theoryStartDate"
                  required
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="date"
                  name="theoryEndDate"
                  required
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
            >
              Create Session
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
