import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, Users } from "lucide-react";
import { PrintButton } from "@/components/shared/print-button";

export default async function DutyChartPage() {
  const session = await requireAuth();

  const [institute, activeSession] = await Promise.all([
    prisma.institute.findUnique({ where: { id: session.instituteId } }),
    prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
      include: {
        supervisionDuties: {
          include: {
            staff: true,
            room: true,
          },
          orderBy: [{ examDate: "asc" }, { slot: "asc" }, { role: "asc" }],
        },
      },
    }),
  ]);

  const duties = activeSession?.supervisionDuties || [];

  // Group by date + slot
  const grouped = new Map<string, { date: Date; slot: string; items: typeof duties }>();
  duties.forEach((d) => {
    const dateStr = new Date(d.examDate).toISOString().split("T")[0];
    const key = `${dateStr}_${d.slot}`;
    if (!grouped.has(key)) {
      grouped.set(key, { date: d.examDate, slot: d.slot, items: [] });
    }
    grouped.get(key)!.items.push(d);
  });

  const roleBadge = (role: string) => {
    switch (role) {
      case "SENIOR_SUPERVISOR":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "JUNIOR_SUPERVISOR":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "RELIEVER":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "PEON":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Screen Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/supervision/allocate"
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Duty Allocator
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Master Supervision Duty Chart</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete session schedule for {activeSession?.name} ({duties.length} assignments)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/supervision/swaps"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
          >
            Swap Approvals
          </Link>
          <PrintButton label="Print Duty Chart" />
        </div>
      </div>

      {/* Printable Container */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Print Header */}
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <h2 className="text-lg font-black uppercase text-slate-950 mt-1">
            {institute?.name} (CENTRE CODE: {institute?.code})
          </h2>
          <div className="text-sm font-bold text-slate-800">
            {activeSession?.name} — MASTER INVIGILATION DUTY CHART
          </div>
        </div>

        {grouped.size === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No duties allocated yet. Go to{" "}
            <Link href="/supervision/allocate" className="text-blue-600 underline">
              Fair Duty Allocation
            </Link>{" "}
            to generate the schedule.
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([key, group]) => {
              const formattedDate = new Date(group.date).toLocaleDateString("en-IN", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div key={key} className="border border-slate-300 rounded-lg overflow-hidden break-inside-avoid">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between text-xs font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-700" />
                      <span>{formattedDate}</span>
                    </div>
                    <span>
                      {group.slot} ({group.slot === "MORNING" ? "09:30 AM – 12:30 PM" : "02:00 PM – 05:00 PM"})
                    </span>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Room / Block</th>
                        <th className="py-2 px-3">Assigned Staff Member</th>
                        <th className="py-2 px-3">Designation</th>
                        <th className="py-2 px-3 print:hidden text-right">Order Letter</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge(
                                item.role
                              )}`}
                            >
                              {item.role.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {item.room?.name || (item.role === "SENIOR_SUPERVISOR" ? "Control Room" : "Floor Duty")}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">{item.staff.name}</td>
                          <td className="py-2 px-3 text-slate-600">{item.staff.designation}</td>
                          <td className="py-2 px-3 print:hidden text-right">
                            <Link
                              href={`/supervision/print/letter?staffId=${item.staffId}`}
                              className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Letter
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* Print Signatures */}
        <div className="mt-12 pt-8 flex justify-between text-xs font-bold text-slate-800">
          <div className="text-center">
            <div className="w-40 border-t border-slate-800 pt-1">Exam Cell Coordinator</div>
          </div>
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
