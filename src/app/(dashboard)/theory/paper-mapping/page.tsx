import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Calendar, Users, DoorOpen, ArrowRight, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

export default async function PaperMappingPage() {
  const session = await requireAuth();

  const activeSession = await prisma.examSession.findFirst({
    where: { instituteId: session.instituteId, isCurrent: true },
    include: {
      theoryPapers: {
        include: {
          course: {
            include: {
              programme: true,
              scheme: true,
              studentCourses: {
                include: {
                  student: {
                    include: {
                      division: true,
                    },
                  },
                },
              },
            },
          },
          seatingAllocations: {
            select: { id: true },
          },
        },
        orderBy: [{ examDate: "asc" }, { slot: "asc" }, { paperCode: "asc" }],
      },
    },
  });

  const totalRoomCapacity = await prisma.room.aggregate({
    where: { instituteId: session.instituteId },
    _sum: { totalCapacity: true },
  });
  const maxCapacity = totalRoomCapacity._sum.totalCapacity || 0;

  // Group papers by unique slot key: "YYYY-MM-DD_SLOT"
  const slotGroups: Record<
    string,
    {
      date: string;
      rawDate: Date;
      slot: string;
      papers: any[];
      totalStudents: number;
      regularCount: number;
      backlogCount: number;
      isSeated: boolean;
      clashes: string[];
    }
  > = {};

  activeSession?.theoryPapers.forEach((paper) => {
    const dateKey = new Date(paper.examDate).toISOString().split("T")[0];
    const key = `${dateKey}_${paper.slot}`;

    if (!slotGroups[key]) {
      slotGroups[key] = {
        date: dateKey,
        rawDate: paper.examDate,
        slot: paper.slot,
        papers: [],
        totalStudents: 0,
        regularCount: 0,
        backlogCount: 0,
        isSeated: false,
        clashes: [],
      };
    }

    const regular = paper.course.studentCourses.filter((sc: any) => sc.type === "REGULAR").length;
    const backlog = paper.course.studentCourses.filter((sc: any) => sc.type === "BACKLOG_ATKT").length;

    slotGroups[key].papers.push({
      ...paper,
      regularCount: regular,
      backlogCount: backlog,
      totalCount: regular + backlog,
    });

    slotGroups[key].regularCount += regular;
    slotGroups[key].backlogCount += backlog;
    slotGroups[key].totalStudents += regular + backlog;

    if (paper.seatingAllocations.length > 0) {
      slotGroups[key].isSeated = true;
    }
  });

  // Clash detection: check if any student appears in more than 1 paper in the same slot
  Object.values(slotGroups).forEach((group) => {
    const studentSeen = new Map<string, string>(); // studentId -> paperCode
    group.papers.forEach((p) => {
      p.course.studentCourses.forEach((sc: any) => {
        if (studentSeen.has(sc.studentId)) {
          group.clashes.push(
            `Student ${sc.student.name} (${sc.student.enrollmentNo}) has clash between ${studentSeen.get(
              sc.studentId
            )} and ${p.paperCode}`
          );
        } else {
          studentSeen.set(sc.studentId, p.paperCode);
        }
      });
    });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Paper-to-Student Mapping & Headcounts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Per-session exam student headcounts (regular + backlog ATKT) and room capacity verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/theory/seating"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-sm transition"
          >
            Seating Generator Wizard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Slots List */}
      <div className="space-y-4">
        {Object.entries(slotGroups).map(([key, group]) => {
          const formattedDate = new Date(group.rawDate).toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          const isMorning = group.slot === "MORNING";
          const capacityUsedPercent = Math.min(
            100,
            Math.round((group.totalStudents / maxCapacity) * 100)
          );

          return (
            <div
              key={key}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition"
            >
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{formattedDate}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isMorning
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-indigo-100 text-indigo-800 border border-indigo-300"
                        }`}
                      >
                        {group.slot} Session ({isMorning ? "09:30 AM" : "02:00 PM"})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {group.papers.length} simultaneous papers scheduled
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-slate-900">
                      {group.totalStudents}{" "}
                      <span className="text-xs font-normal text-slate-500">Students</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {group.regularCount} Regular • {group.backlogCount} ATKT
                    </div>
                  </div>

                  <Link
                    href={`/theory/seating?date=${group.date}&slot=${group.slot}`}
                    className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-lg text-xs border border-blue-200 transition"
                  >
                    <span>{group.isSeated ? "Manage Seating" : "Generate Seating"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Papers in this slot */}
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.papers.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-50/60 rounded-lg border border-slate-200 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {p.paperCode}
                          </span>
                          <span className="font-mono text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded">
                            {p.schemeString}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 mt-1">{p.paperName}</div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                        <span>
                          Headcount: <strong className="text-slate-800">{p.totalCount}</strong>
                        </span>
                        {p.backlogCount > 0 && (
                          <span className="text-rose-600 font-medium">
                            {p.backlogCount} backlog
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Clash Notice if any */}
                {group.clashes.length > 0 && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Student Exam Clash Detected:</span>
                      {group.clashes.map((c, i) => (
                        <div key={i} className="text-[11px] mt-0.5">
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
