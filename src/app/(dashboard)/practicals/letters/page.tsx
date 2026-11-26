import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/shared/print-button";

export default async function PracticalLettersPage(props: {
  searchParams?: Promise<{ slotId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireAuth();

  const [institute, activeSession] = await Promise.all([
    prisma.institute.findUnique({ where: { id: session.instituteId } }),
    prisma.examSession.findFirst({ where: { instituteId: session.instituteId, isCurrent: true } }),
  ]);

  const slot = searchParams?.slotId
    ? await prisma.practicalSlot.findUnique({
        where: { id: searchParams.slotId },
        include: {
          course: { include: { assessmentHeads: true } },
          division: true,
          batch: {
            include: {
              students: { orderBy: { rollNo: "asc" } },
            },
          },
          room: true,
          internalExaminer: true,
          externalExaminer: true,
        },
      })
    : null;

  if (!slot) {
    return (
      <div className="max-w-3xl mx-auto p-8 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
        Practical slot not specified. Open from{" "}
        <Link href="/practicals/examiners" className="text-blue-600 underline">
          External Examiners
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Link
          href="/practicals/examiners"
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Examiners
        </Link>
        <PrintButton label="Print Letter & Batch Sheet" />
      </div>

      {/* Page 1: External Examiner Appointment Letter */}
      <div className="bg-white p-10 border border-slate-300 shadow-sm rounded-lg print:border-none print:shadow-none break-after-page text-slate-900 space-y-5">
        <div className="text-center border-b-2 border-slate-900 pb-3">
          <div className="text-xs font-bold uppercase text-slate-600">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION (MSBTE)
          </div>
          <h1 className="text-lg font-black uppercase mt-1">{institute?.name} ({institute?.code})</h1>
          <div className="text-xs font-bold">{activeSession?.name} — PRACTICAL EXAMINATION</div>
        </div>

        <div className="text-center text-sm font-bold underline uppercase">
          APPOINTMENT ORDER FOR EXTERNAL EXAMINER
        </div>

        <div className="text-xs space-y-1">
          <div>To,</div>
          <div className="font-bold text-sm">{slot.externalExaminer?.name || "External Examiner"}</div>
          <div>{slot.externalExaminer?.collegeName}</div>
        </div>

        <p className="text-xs leading-relaxed">
          Sir / Madam, you are cordially appointed as <strong>External Examiner</strong> for the
          practical/oral examination of <strong>{slot.course.code} - {slot.course.title}</strong>{" "}
          (Sem {slot.course.semester}, Batch {slot.division.name}-{slot.batch.name}) scheduled on{" "}
          <strong>{new Date(slot.examDate).toLocaleDateString("en-IN")}</strong> ({slot.startTime} –{" "}
          {slot.endTime}) in <strong>{slot.room.name}</strong> along with Internal Examiner{" "}
          <strong>{slot.internalExaminer.name}</strong>.
        </p>

        <div className="pt-14 flex justify-between text-xs font-bold">
          <div>Head of Department</div>
          <div>Principal ({institute?.principalName})</div>
        </div>
      </div>

      {/* Page 2: Batch Attendance & Blank Mark Sheet */}
      <div className="bg-white p-8 border border-slate-300 shadow-sm rounded-lg print:border-none print:shadow-none text-slate-900 space-y-4">
        <div className="text-center border-b-2 border-slate-900 pb-2">
          <h2 className="text-base font-black uppercase">{institute?.name} ({institute?.code})</h2>
          <div className="text-xs font-bold">
            PRACTICAL ATTENDANCE & BLANK MARK SHEET • {slot.course.code} ({slot.course.title})
          </div>
          <div className="text-[11px] text-slate-600">
            Batch: {slot.division.name}-{slot.batch.name} | Date:{" "}
            {new Date(slot.examDate).toLocaleDateString("en-IN")} | Lab: {slot.room.name}
          </div>
        </div>

        <table className="w-full text-xs border border-slate-400">
          <thead className="bg-slate-100 border-b border-slate-400 font-bold">
            <tr>
              <th className="p-1.5 border-r border-slate-400 text-center w-10">Sr</th>
              <th className="p-1.5 border-r border-slate-400 text-left">Seat No</th>
              <th className="p-1.5 border-r border-slate-400 text-left">Enrollment No</th>
              <th className="p-1.5 border-r border-slate-400 text-left">Student Name</th>
              <th className="p-1.5 border-r border-slate-400 text-center w-20">SA-PR Marks</th>
              <th className="p-1.5 text-center w-28">Student Sign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {slot.batch.students.map((st, i) => (
              <tr key={st.id}>
                <td className="p-1.5 border-r border-slate-400 text-center font-mono">{i + 1}</td>
                <td className="p-1.5 border-r border-slate-400 font-mono font-bold">{st.seatNo || st.rollNo}</td>
                <td className="p-1.5 border-r border-slate-400 font-mono">{st.enrollmentNo}</td>
                <td className="p-1.5 border-r border-slate-400">{st.name}</td>
                <td className="p-1.5 border-r border-slate-400"></td>
                <td className="p-1.5"></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pt-10 flex justify-between text-xs font-bold">
          <div>Internal Examiner: {slot.internalExaminer.name}</div>
          <div>External Examiner: {slot.externalExaminer?.name || "________________"}</div>
        </div>
      </div>
    </div>
  );
}
