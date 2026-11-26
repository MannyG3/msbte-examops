import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { BookOpen, Layers, Clock, AlertCircle } from "lucide-react";

export default async function CoursesMasterPage() {
  const session = await requireAuth();

  const courses = await prisma.course.findMany({
    where: { programme: { instituteId: session.instituteId } },
    include: {
      programme: true,
      scheme: true,
      assessmentHeads: {
        orderBy: { headType: "asc" },
      },
      _count: {
        select: {
          studentCourses: true,
        },
      },
    },
    orderBy: [{ semester: "asc" }, { code: "asc" }],
  });

  const tagBadge = (tag: string) => {
    switch (tag) {
      case "INTERNAL":
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">@ Internal</span>;
      case "EXTERNAL":
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[10px] font-semibold"># External</span>;
      case "ONLINE":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">*# Online</span>;
      case "INTERNAL_ONLINE":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">@$ Int Online</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Courses & Assessment Heads</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full MSBTE curriculum scheme (K Scheme & I Scheme backlog) with passing rules & tags
          </p>
        </div>
        <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
          Total Courses: <span className="font-bold text-blue-700">{courses.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Sem / Prog</th>
                <th className="py-3 px-4">Course Code & Name</th>
                <th className="py-3 px-4">Scheme</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Assessment Heads (Max / Min & Tag)</th>
                <th className="py-3 px-4 text-center">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-bold text-slate-800">Sem {c.semester}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {c.programme.code}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {c.code}
                      </span>
                      <span className="font-bold text-slate-900">{c.title}</span>
                      <span className="text-slate-400 text-[11px]">({c.abbreviation})</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        c.scheme.name === "K"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {c.scheme.name} Scheme
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                    {c.hasTheory ? `${c.paperDurationMins / 60} hrs` : "No Theory"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {c.assessmentHeads.map((h) => (
                        <div
                          key={h.id}
                          className="bg-slate-100 border border-slate-200/90 rounded-md px-2 py-1 text-[11px] flex items-center gap-1.5"
                        >
                          <span className="font-semibold text-slate-700">{h.headType}:</span>
                          <span className="font-mono text-slate-900">
                            {h.maxMarks}/{h.minMarks}
                          </span>
                          {tagBadge(h.tag)}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">
                      {c._count.studentCourses}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
