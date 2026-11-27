import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Plus, CheckCircle2 } from "lucide-react";
import { logAuditAction } from "@/lib/audit";

export default async function SessionsPage() {
  const session = await requireTenantAuth();

  const sessions = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    return tx.examSession.findMany({
      where: { instituteId: session.instituteId },
      include: {
        _count: { select: { timetableEntries: true, candidates: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  async function createSession(formData: FormData) {
    "use server";
    const currentSession = await requireTenantAuth();
    const code = (formData.get("code") as string).toUpperCase().trim();
    const name = formData.get("name") as string;
    const theoryStartDate = new Date(formData.get("theoryStartDate") as string);
    const theoryEndDate = new Date(formData.get("theoryEndDate") as string);

    const created = await withTenant(currentSession.instituteId, currentSession.isSuperAdmin, async (tx) => {
      return tx.examSession.create({
        data: {
          instituteId: currentSession.instituteId,
          code,
          name,
          theoryStartDate,
          theoryEndDate,
          status: "ACTIVE",
        },
      });
    });

    await logAuditAction({
      instituteId: currentSession.instituteId,
      userId: currentSession.userId,
      action: "CREATE_EXAM_SESSION",
      entity: "ExamSession",
      entityId: created.id,
      afterData: { code, name },
    });

    revalidatePath("/sessions");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">MSBTE Examination Sessions</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure Winter-2026 / Summer-2027 sessions and theory/practical windows
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded border border-blue-200">
                    {s.code}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">{s.name}</h2>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {s.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {s._count.timetableEntries} papers • {s._count.candidates} candidates
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Theory Window: {new Date(s.theoryStartDate).toLocaleDateString("en-IN")} –{" "}
                {new Date(s.theoryEndDate).toLocaleDateString("en-IN")}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Create Exam Session
          </h2>
          <form action={createSession} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Code (e.g. S27)</label>
              <input type="text" name="code" required maxLength={6} placeholder="S27" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
              <input type="text" name="name" required placeholder="Summer-2027" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Theory Start</label>
                <input type="date" name="theoryStartDate" required className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Theory End</label>
                <input type="date" name="theoryEndDate" required className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs" />
              </div>
            </div>
            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
              Create Session
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
