import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/shared/print-button";

export default async function DoorChartPage(props: {
  searchParams?: Promise<{ date?: string; slot?: string; room?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireAuth();

  const examDate = searchParams?.date || "2026-11-17";
  const slot = (searchParams?.slot || "MORNING").toUpperCase();
  const roomId = searchParams?.room;

  const parsedDate = new Date(examDate);

  const institute = await prisma.institute.findUnique({
    where: { id: session.instituteId },
  });

  const activeSession = await prisma.examSession.findFirst({
    where: { instituteId: session.instituteId, isCurrent: true },
  });

  const roomWhere: any = { instituteId: session.instituteId };
  if (roomId) roomWhere.id = roomId;

  const rooms = await prisma.room.findMany({
    where: roomWhere,
    include: {
      seatingAllocations: {
        where: {
          paper: {
            slot,
            examDate: {
              gte: new Date(new Date(parsedDate).setHours(0, 0, 0, 0)),
              lte: new Date(new Date(parsedDate).setHours(23, 59, 59, 999)),
            },
          },
        },
        include: {
          student: true,
          paper: true,
        },
        orderBy: [{ benchNo: "asc" }, { seatPosition: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  // Filter to rooms with seated allocations
  const activeRooms = rooms.filter((r) => r.seatingAllocations.length > 0);

  const formattedDate = new Date(examDate).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Screen action bar (hidden on print) */}
      <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Link
          href={`/theory/seating?date=${examDate}&slot=${slot}`}
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Seating Management
        </Link>

        <PrintButton label="Print All Door Charts" />
      </div>

      {/* Printable Door Sheets */}
      <div className="space-y-8">
        {activeRooms.map((room) => {
          // Benches
          const benches = Array.from(
            new Set(room.seatingAllocations.map((a) => a.benchNo))
          ).sort((a, b) => a - b);

          // Paper counts for summary
          const paperCounts: Record<string, { name: string; count: number; start: string; end: string }> = {};
          room.seatingAllocations.forEach((a) => {
            const code = a.paper.paperCode;
            if (!paperCounts[code]) {
              paperCounts[code] = {
                name: a.paper.paperName,
                count: 0,
                start: a.student.seatNo || a.student.rollNo,
                end: a.student.seatNo || a.student.rollNo,
              };
            }
            paperCounts[code].count++;
            if (a.student.seatNo) {
              paperCounts[code].end = a.student.seatNo;
            }
          });

          return (
            <div
              key={room.id}
              className="bg-white p-8 border border-slate-300 shadow-sm rounded-lg print:border-none print:shadow-none print:p-0 print:m-0 break-after-page text-slate-900"
            >
              {/* MSBTE Official Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <div className="text-xs font-bold tracking-wider uppercase text-slate-600">
                  MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
                </div>
                <h1 className="text-lg font-black uppercase tracking-tight text-slate-950 mt-1">
                  {institute?.name} (CENTRE CODE: {institute?.code})
                </h1>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {activeSession?.name} • ROOM SEATING DISPLAY CHART
                </div>
              </div>

              {/* Meta details banner */}
              <div className="grid grid-cols-3 gap-2 border border-slate-400 p-2.5 text-xs font-semibold mb-4 bg-slate-50">
                <div>
                  <span className="text-slate-500">EXAM DATE:</span> {formattedDate}
                </div>
                <div className="text-center">
                  <span className="text-slate-500">SESSION:</span> {slot} (
                  {slot === "MORNING" ? "09:30 AM – 12:30 PM" : "02:00 PM – 05:00 PM"})
                </div>
                <div className="text-right">
                  <span className="text-slate-500">ROOM / BLOCK:</span>{" "}
                  <strong className="text-sm">{room.name}</strong>
                </div>
              </div>

              {/* Bench Allocation Table */}
              <table className="w-full text-xs border border-slate-400 mb-4">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                    <th className="border-r border-slate-400 p-2 text-center w-16">Bench No</th>
                    <th className="border-r border-slate-400 p-2 text-left">
                      Seat 1 (Left Position)
                    </th>
                    <th className="p-2 text-left">Seat 2 (Right Position - Alternate)</th>
                  </tr>
                </thead>
                <tbody>
                  {benches.map((bNo) => {
                    const left = room.seatingAllocations.find(
                      (a) => a.benchNo === bNo && a.seatPosition === 1
                    );
                    const right = room.seatingAllocations.find(
                      (a) => a.benchNo === bNo && a.seatPosition === 2
                    );

                    return (
                      <tr key={bNo} className="border-b border-slate-300">
                        <td className="border-r border-slate-400 p-2 text-center font-bold font-mono">
                          {bNo}
                        </td>
                        <td className="border-r border-slate-400 p-2">
                          {left ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-mono font-bold text-slate-950 text-sm">
                                  {left.student.seatNo || left.student.rollNo}
                                </span>
                                <span className="text-slate-600 block text-[11px]">
                                  {left.student.name}
                                </span>
                              </div>
                              <span className="font-mono font-bold px-1.5 py-0.5 bg-slate-100 border border-slate-400 rounded text-[10px]">
                                {left.paper.paperCode}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="p-2">
                          {right ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-mono font-bold text-slate-950 text-sm">
                                  {right.student.seatNo || right.student.rollNo}
                                </span>
                                <span className="text-slate-600 block text-[11px]">
                                  {right.student.name}
                                </span>
                              </div>
                              <span className="font-mono font-bold px-1.5 py-0.5 bg-slate-100 border border-slate-400 rounded text-[10px]">
                                {right.paper.paperCode}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Room Summary Table */}
              <div className="mb-8">
                <div className="text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-700">
                  Subject-wise Student Count & Answer Books Required:
                </div>
                <table className="w-full text-xs border border-slate-400">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                      <th className="p-1.5 border-r border-slate-400 text-left">Subject Code</th>
                      <th className="p-1.5 border-r border-slate-400 text-left">Subject Name</th>
                      <th className="p-1.5 border-r border-slate-400 text-center">Seat Range</th>
                      <th className="p-1.5 text-center">Total Present</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(paperCounts).map(([code, info]) => (
                      <tr key={code} className="border-b border-slate-300">
                        <td className="p-1.5 border-r border-slate-400 font-mono font-bold">
                          {code}
                        </td>
                        <td className="p-1.5 border-r border-slate-400">{info.name}</td>
                        <td className="p-1.5 border-r border-slate-400 text-center font-mono">
                          {info.start} to {info.end}
                        </td>
                        <td className="p-1.5 text-center font-bold">{info.count}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={3} className="p-1.5 border-r border-slate-400 text-right">
                        Total Students in Room:
                      </td>
                      <td className="p-1.5 text-center">{room.seatingAllocations.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Formal Signatures Block */}
              <div className="pt-10 flex justify-between text-xs font-bold text-slate-800">
                <div className="text-center">
                  <div className="w-36 border-t border-slate-800 pt-1">Junior Supervisor</div>
                  <div className="text-[10px] text-slate-500 font-normal">Signature & Date</div>
                </div>
                <div className="text-center">
                  <div className="w-36 border-t border-slate-800 pt-1">Senior Supervisor</div>
                  <div className="text-[10px] text-slate-500 font-normal">Exam Block In-Charge</div>
                </div>
                <div className="text-center">
                  <div className="w-36 border-t border-slate-800 pt-1">Officer-in-Charge / Principal</div>
                  <div className="text-[10px] text-slate-500 font-normal">{institute?.principalName}</div>
                </div>
              </div>
            </div>
          );
        })}

        {activeRooms.length === 0 && (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            No seating allocations found for {examDate} ({slot}). Please generate seating first.
          </div>
        )}
      </div>
    </div>
  );
}
