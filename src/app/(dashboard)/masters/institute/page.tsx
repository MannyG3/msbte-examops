import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Building2, Save, MapPin, User, Hash } from "lucide-react";
import { logAuditAction } from "@/lib/audit";

export default async function InstituteMasterPage() {
  const session = await requireAuth();

  const institute = await prisma.institute.findUnique({
    where: { id: session.instituteId },
  });

  async function updateInstitute(formData: FormData) {
    "use server";
    const currentSession = await requireAuth();
    const name = formData.get("name") as string;
    const region = formData.get("region") as string;
    const address = formData.get("address") as string;
    const principalName = formData.get("principalName") as string;

    const before = await prisma.institute.findUnique({ where: { id: currentSession.instituteId } });

    const updated = await prisma.institute.update({
      where: { id: currentSession.instituteId },
      data: {
        name,
        region,
        address,
        principalName,
      },
    });

    await logAuditAction({
      instituteId: currentSession.instituteId,
      userId: currentSession.userId,
      action: "UPDATE_INSTITUTE_PROFILE",
      entity: "Institute",
      entityId: currentSession.instituteId,
      beforeData: before,
      afterData: updated,
    });

    revalidatePath("/masters/institute");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Institute Profile & Header</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Details used on every generated MSBTE duty chart, door display, and official letter
          </p>
        </div>
        <span className="bg-blue-50 text-blue-700 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-blue-200">
          MSBTE Code: {institute?.code}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <form action={updateInstitute} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Institute Code (Read Only)
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={institute?.code || ""}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm font-semibold"
                />
                <Hash className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                MSBTE Region
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="region"
                  defaultValue={institute?.region || ""}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Full Institute Name (Printed on Timetables & Door Charts)
            </label>
            <input
              type="text"
              name="name"
              defaultValue={institute?.name || ""}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Campus Postal Address
            </label>
            <textarea
              name="address"
              rows={2}
              defaultValue={institute?.address || ""}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Principal Full Name (For Signatures Block)
            </label>
            <div className="relative">
              <input
                type="text"
                name="principalName"
                defaultValue={institute?.principalName || ""}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
