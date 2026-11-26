import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/shared/print-button";

export default async function DutyAppointmentLetterPage(props: {
  searchParams?: Promise<{ staffId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireAuth();

  const staffId = searchParams?.staffId;

  const [institute, activeSession] = await Promise.all([
    prisma.institute.findUnique({ where: { id: session.instituteId } }),
    prisma.examSession.findFirst({ where: { instituteId: session.instituteId, isCurrent: true } }),
  ]);

  const staff = staffId
    ? await prisma.staff.findUnique({
        where: { id: staffId },
        include: {
          department: true,
          supervisionDuties: {
            where: { sessionId: activeSession?.id },
            include: { room: true },
            orderBy: [{ examDate: "asc" }, { slot: "asc" }],
          },
        },
      })
    : null;

  if (!staff || staff.instituteId !== session.instituteId) {
    return (
      <div className="max-w-3xl mx-auto p-8 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
        Staff member not found or no duties assigned.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Link
          href="/supervision/chart"
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Duty Chart
        </Link>

        <PrintButton label="Print Appointment Order" />
      </div>

      {/* Formal MSBTE Appointment Letter */}
      <div className="bg-white p-10 border border-slate-300 shadow-sm rounded-lg print:border-none print:shadow-none text-slate-900 space-y-6">
        <div className="text-center border-b-2 border-slate-900 pb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
            GOVERNMENT OF MAHARASHTRA • MSBTE EXAMINATION CELL
          </div>
          <h1 className="text-xl font-black uppercase text-slate-950 mt-1">
            {institute?.name}
          </h1>
          <div className="text-xs text-slate-600">{institute?.address}</div>
          <div className="text-xs font-bold mt-1">
            INSTITUTE CODE: {institute?.code} | {activeSession?.name}
          </div>
        </div>

        <div className="flex justify-between text-xs font-semibold">
          <div>Ref No: MSBTE/{activeSession?.code}/INV/{staff.id.slice(-4).toUpperCase()}</div>
          <div>Date: {new Date().toLocaleDateString("en-IN")}</div>
        </div>

        <div className="text-center text-sm font-bold underline uppercase tracking-wide py-1">
          ORDER OF APPOINTMENT AS INVIGILATOR / SUPERVISOR
        </div>

        <div className="text-xs space-y-1">
          <div>To,</div>
          <div className="font-bold text-sm">{staff.name}</div>
          <div>{staff.designation}, {staff.department.name}</div>
        </div>

        <p className="text-xs leading-relaxed text-justify">
          Sir / Madam,
          <br />
          With reference to the forthcoming <strong>{activeSession?.name}</strong> conducted by the
          Maharashtra State Board of Technical Education (MSBTE), Mumbai, you are hereby appointed for
          examination supervision duty at Centre <strong>{institute?.code}</strong> as per the
          schedule detailed below. You are requested to report to the Exam Control Room at least{" "}
          <strong>30 minutes prior</strong> to the scheduled commencement of the examination.
        </p>

        <table className="w-full text-xs border border-slate-400">
          <thead className="bg-slate-100 border-b border-slate-400 font-bold">
            <tr>
              <th className="p-2 border-r border-slate-400 text-center w-12">Sr.</th>
              <th className="p-2 border-r border-slate-400 text-left">Exam Date</th>
              <th className="p-2 border-r border-slate-400 text-left">Slot & Timing</th>
              <th className="p-2 border-r border-slate-400 text-left">Role</th>
              <th className="p-2 text-left">Assigned Room / Block</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {staff.supervisionDuties.map((duty, idx) => (
              <tr key={duty.id}>
                <td className="p-2 border-r border-slate-400 text-center font-mono">{idx + 1}</td>
                <td className="p-2 border-r border-slate-400 font-semibold">
                  {new Date(duty.examDate).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="p-2 border-r border-slate-400">
                  {duty.slot} ({duty.slot === "MORNING" ? "09:30 AM – 12:30 PM" : "02:00 PM – 05:00 PM"})
                </td>
                <td className="p-2 border-r border-slate-400 font-semibold">
                  {duty.role.replace("_", " ")}
                </td>
                <td className="p-2 font-bold">
                  {duty.room?.name || "Control Room / Floor Duty"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bg-slate-50 border border-slate-300 p-3 text-[11px] space-y-1">
          <div className="font-bold">Important Instructions:</div>
          <div>1. Duty is mandatory as per MSBTE examination norms.</div>
          <div>2. In case of unavoidable emergency, submit a formal swap request in ExamOps prior to 24 hours.</div>
          <div>3. Mobile phones are strictly prohibited inside the examination hall.</div>
        </div>

        <div className="pt-14 flex justify-between text-xs font-bold">
          <div className="text-center">
            <div className="w-40 border-t border-slate-800 pt-1">Officer-in-Charge</div>
          </div>
          <div className="text-center">
            <div className="w-40 border-t border-slate-800 pt-1">Principal</div>
            <div className="text-[10px] font-normal text-slate-500">{institute?.principalName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
