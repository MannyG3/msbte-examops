import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  GraduationCap,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  BookOpen,
  LogOut,
} from "lucide-react";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "examops_secret_key_change_in_production_2026"
);

async function getStudentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("examops_student_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as { studentId: string; instituteId: string };
  } catch {
    return null;
  }
}

export default async function StudentPortalDashboard() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/portal/login");
  }

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    include: {
      institute: true,
      programme: true,
      division: true,
      batch: true,
      enrolledCourses: {
        include: { course: true },
      },
      seatingAllocations: {
        include: {
          paper: true,
          room: true,
        },
      },
    },
  });

  if (!student) {
    redirect("/portal/login");
  }

  const activeSession = await prisma.examSession.findFirst({
    where: { instituteId: student.instituteId, isCurrent: true },
  });

  const enrolledCourseIds = student.enrolledCourses.map((ec) => ec.courseId);

  const [theoryPapers, practicalSlots] = await Promise.all([
    activeSession
      ? prisma.theoryPaper.findMany({
          where: {
            sessionId: activeSession.id,
            courseId: { in: enrolledCourseIds },
          },
          orderBy: [{ examDate: "asc" }, { slot: "asc" }],
        })
      : [],
    activeSession && student.batchId
      ? prisma.practicalSlot.findMany({
          where: {
            sessionId: activeSession.id,
            batchId: student.batchId,
            courseId: { in: enrolledCourseIds },
          },
          include: {
            course: true,
            room: true,
            internalExaminer: true,
          },
          orderBy: [{ examDate: "asc" }, { startTime: "asc" }],
        })
      : [],
  ]);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-4 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">{student.institute.name}</div>
              <div className="text-[11px] text-slate-400">
                ExamOps Student Portal • {activeSession?.code || "W26"}
              </div>
            </div>
          </div>

          <form action="/api/portal/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Student Identity & Eligibility Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
              {student.programme.name} • Semester {student.semester}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{student.name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600 font-mono">
              <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                Enrollment: <strong>{student.enrollmentNo}</strong>
              </span>
              <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded border border-blue-200">
                Seat No: <strong>{student.seatNo || "Pending"}</strong>
              </span>
              <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                Div {student.division?.name || "A"} / Batch {student.batch?.name || "A1"}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            {student.status === "DETAINED" ? (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 max-w-xs">
                <div className="font-bold flex items-center gap-1.5 text-rose-700">
                  <AlertTriangle className="w-4 h-4" /> DETAINED / NOT ELIGIBLE
                </div>
                <div className="mt-1 text-[11px]">{student.detentionReason}</div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="font-bold text-emerald-800">ELIGIBLE FOR EXAM</div>
                  <div className="text-[11px] text-emerald-700">All attendance & FA-PR criteria met</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Theory Timetable & Room/Seat Locator */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Theory Examination Timetable & Seating Locator
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {theoryPapers.map((paper) => {
              const alloc = student.seatingAllocations.find((a) => a.paperId === paper.id);
              const isBacklog =
                student.enrolledCourses.find((ec) => ec.courseId === paper.courseId)?.type ===
                "BACKLOG_ATKT";

              return (
                <div
                  key={paper.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                        {paper.paperCode}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{paper.paperName}</span>
                      {isBacklog && (
                        <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-200">
                          ATKT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(paper.examDate).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span>
                        {paper.slot} ({paper.startTime} – {paper.endTime})
                      </span>
                    </div>
                  </div>

                  {alloc ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-xs text-emerald-950 flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <div className="font-bold">
                          {alloc.room.name} ({alloc.room.building}, Floor {alloc.room.floor})
                        </div>
                        <div className="text-[11px] font-mono text-emerald-800">
                          Bench {alloc.benchNo} • Seat {alloc.seatPosition === 1 ? "1 (Left)" : "2 (Right)"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic bg-slate-100 px-3 py-1.5 rounded-lg">
                      Seating not published yet
                    </span>
                  )}
                </div>
              );
            })}

            {theoryPapers.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No theory papers scheduled for your enrolled courses yet.
              </div>
            )}
          </div>
        </div>

        {/* Practical Exam Slots */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Practical / Oral Examination Schedule (Batch {student.batch?.name || "A1"})
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {practicalSlots.map((slot) => (
              <div
                key={slot.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    <span className="font-mono text-purple-700 mr-2">{slot.course.code}</span>
                    {slot.course.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(slot.examDate).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    • {slot.startTime} – {slot.endTime}
                  </div>
                </div>

                <div className="text-xs font-semibold bg-purple-50 text-purple-800 px-3 py-1.5 rounded-lg border border-purple-200">
                  Lab: {slot.room.name}
                </div>
              </div>
            ))}

            {practicalSlots.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No practical slots published for your batch yet.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
