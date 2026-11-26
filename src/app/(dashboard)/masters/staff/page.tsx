import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Users, Plus, Mail, Phone, Shield } from "lucide-react";

export default async function StaffMasterPage() {
  const session = await requireAuth();

  const [staffMembers, departments] = await Promise.all([
    prisma.staff.findMany({
      where: { instituteId: session.instituteId },
      include: {
        department: true,
        user: true,
        teachingCourses: {
          include: {
            course: true,
          },
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.department.findMany({
      where: { instituteId: session.instituteId },
    }),
  ]);

  async function addStaff(formData: FormData) {
    "use server";
    const currentSession = await requireAuth();
    const name = formData.get("name") as string;
    const email = (formData.get("email") as string).toLowerCase().trim();
    const phone = formData.get("phone") as string;
    const designation = formData.get("designation") as string;
    const departmentId = formData.get("departmentId") as string;
    const type = formData.get("type") as string;
    const maxDuties = parseInt(formData.get("maxDuties") as string, 10) || 10;

    await prisma.staff.create({
      data: {
        instituteId: currentSession.instituteId,
        departmentId,
        name,
        email,
        phone: phone || null,
        designation,
        type,
        maxDutiesPerSession: maxDuties,
      },
    });

    revalidatePath("/masters/staff");
  }

  const staffTypeBadge = (type: string) => {
    switch (type) {
      case "TEACHING":
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-semibold">Teaching Faculty</span>;
      case "LAB_ASSISTANT":
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-semibold">Lab Assistant</span>;
      case "PEON":
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold">Support / Peon</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Staff & Invigilator Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Teaching and technical staff pool for theory invigilation, practicals, and marks entry
          </p>
        </div>
        <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
          Total Staff: <span className="font-bold text-blue-700">{staffMembers.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Staff List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Staff Members ({staffMembers.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {staffMembers.map((staff) => (
              <div key={staff.id} className="p-3.5 hover:bg-slate-50 transition flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{staff.name}</span>
                    {staffTypeBadge(staff.type)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                    <span>{staff.designation} • {staff.department.name}</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-mono">{staff.email}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800">
                    Max: {staff.maxDutiesPerSession} Duties
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {staff.user ? "ExamOps User" : "Invigilator Only"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Add Staff */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Add Staff Member
          </h2>

          <form action={addStaff} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Prof. K. R. Sharma"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Official Email *
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="kr.sharma@gp-pune.ac.in"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  name="designation"
                  required
                  defaultValue="Lecturer"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Max Duties
                </label>
                <input
                  type="number"
                  name="maxDuties"
                  required
                  defaultValue={10}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Staff Type
                </label>
                <select
                  name="type"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                >
                  <option value="TEACHING">Teaching</option>
                  <option value="LAB_ASSISTANT">Lab Assistant</option>
                  <option value="PEON">Peon</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Department
                </label>
                <select
                  name="departmentId"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
            >
              Add Staff
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
