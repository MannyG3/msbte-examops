import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { BookOpen, Plus, Users, Layers } from "lucide-react";

export default async function ProgrammesPage() {
  const session = await requireAuth();

  const programmes = await prisma.programme.findMany({
    where: { instituteId: session.instituteId },
    include: {
      department: true,
      _count: {
        select: {
          courses: true,
          students: true,
        },
      },
    },
  });

  const departments = await prisma.department.findMany({
    where: { instituteId: session.instituteId },
  });

  async function addProgramme(formData: FormData) {
    "use server";
    const currentSession = await requireAuth();
    const code = (formData.get("code") as string).toUpperCase().trim();
    const name = formData.get("name") as string;
    const departmentId = formData.get("departmentId") as string;

    await prisma.programme.create({
      data: {
        instituteId: currentSession.instituteId,
        departmentId,
        code,
        name,
      },
    });

    revalidatePath("/masters/programmes");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Programmes & Disciplines</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            MSBTE Diploma Programmes (CO, IF, ME, EE, CE...) and departments
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Programmes list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Configured Programmes ({programmes.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {programmes.map((p) => (
              <div key={p.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                      {p.code}
                    </span>
                    <h2 className="text-sm font-bold text-slate-900">{p.name}</h2>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Dept: {p.department.name} ({p.department.code})
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{p._count.courses}</div>
                    <div className="text-[10px] text-slate-400">Courses</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{p._count.students}</div>
                    <div className="text-[10px] text-slate-400">Students</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Add Programme */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Add New Programme
          </h2>

          <form action={addProgramme} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Programme Code (e.g. IF, ME, EE)
              </label>
              <input
                type="text"
                name="code"
                required
                maxLength={4}
                placeholder="IF"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Programme Title
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Diploma in Information Technology"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Department
              </label>
              <select
                name="departmentId"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
            >
              Add Programme
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
