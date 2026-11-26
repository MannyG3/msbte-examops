import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserCheck, Upload, Search, Filter } from "lucide-react";

export default async function StudentsMasterPage(props: {
  searchParams?: Promise<{ sem?: string; q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireAuth();
  const selectedSem = searchParams?.sem ? parseInt(searchParams.sem, 10) : undefined;
  const searchQuery = searchParams?.q || "";

  const whereClause: any = {
    instituteId: session.instituteId,
  };

  if (selectedSem) {
    whereClause.semester = selectedSem;
  }

  if (searchQuery) {
    whereClause.OR = [
      { name: { contains: searchQuery } },
      { enrollmentNo: { contains: searchQuery } },
      { seatNo: { contains: searchQuery } },
      { rollNo: { contains: searchQuery } },
    ];
  }

  const [students, totalCount, semCounts] = await Promise.all([
    prisma.student.findMany({
      where: whereClause,
      include: {
        programme: true,
        division: true,
        batch: true,
        enrolledCourses: {
          include: {
            course: true,
          },
        },
      },
      orderBy: [{ semester: "asc" }, { rollNo: "asc" }],
      take: 100,
    }),
    prisma.student.count({ where: { instituteId: session.instituteId } }),
    prisma.student.groupBy({
      by: ["semester"],
      where: { instituteId: session.instituteId },
      _count: { id: true },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Examination Roster</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Student enrollments, MSBTE hall ticket seat numbers, batches, and course enrollments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/masters/students/import"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-sm transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV / Excel
          </Link>
        </div>
      </div>

      {/* Semester Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Link
          href="/masters/students"
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            !selectedSem
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          All Students ({totalCount})
        </Link>
        {[1, 3, 5].map((sem) => {
          const count = semCounts.find((s) => s.semester === sem)?._count.id || 0;
          return (
            <Link
              key={sem}
              href={`/masters/students?sem=${sem}`}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedSem === sem
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Semester {sem} ({count})
            </Link>
          );
        })}
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Enrollment No (10-Digit)</th>
                <th className="py-3 px-4">Seat No (Hall Ticket)</th>
                <th className="py-3 px-4">Sem / Div / Batch</th>
                <th className="py-3 px-4">Enrolled Courses</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {s.rollNo}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900">{s.name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                    {s.enrollmentNo}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                    {s.seatNo || "—"}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-semibold text-slate-800">Sem {s.semester}</span>
                    <span className="text-slate-400 mx-1">•</span>
                    <span>Div {s.division?.name || "A"}</span>
                    {s.batch && (
                      <span className="ml-1 bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded border border-slate-200">
                        {s.batch.name}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {s.enrolledCourses.map((ec) => (
                        <span
                          key={ec.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                            ec.type === "BACKLOG_ATKT"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ec.course.code}
                          {ec.type === "BACKLOG_ATKT" && " (ATKT)"}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === "REGULAR"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">
          Showing {students.length} of {totalCount} students
        </div>
      </div>
    </div>
  );
}
