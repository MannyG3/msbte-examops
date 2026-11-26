import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/shared/print-button";

export default async function NoticeBoardPage(props: {
  searchParams?: Promise<{ date?: string; slot?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireAuth();

  const examDate = searchParams?.date || "2026-11-17";
  const slot = (searchParams?.slot || "MORNING").toUpperCase();
  const parsedDate = new Date(examDate);

  const [institute, activeSession, allocations] = await Promise.all([
    prisma.institute.findUnique({ where: { id: session.instituteId } }),
    prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
    }),
    prisma.seatingAllocation.findMany({
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
        room: true,
        paper: true,
      },
      orderBy: [{ paperId: "asc" }, { roomId: "asc" }, { benchNo: "asc" }],
    }),
  ]);

  // Aggregate by Paper & Room to create the master seat range notice board directory
  const directory: Record<
    string,
    {
      paperCode: string;
      paperName: string;
      schemeString: string;
      rooms: {
        roomName: string;
        building: string;
        floor: number;
        startSeat: string;
        endSeat: string;
        count: number;
      }[];
      totalCount: number;
    }
  > = {};

  allocations.forEach((a) => {
    const pCode = a.paper.paperCode;
    if (!directory[pCode]) {
      directory[pCode] = {
        paperCode: pCode,
        paperName: a.paper.paperName,
        schemeString: a.paper.schemeString,
        rooms: [],
        totalCount: 0,
      };
    }

    directory[pCode].totalCount++;

    let roomEntry = directory[pCode].rooms.find((r) => r.roomName === a.room.name);
    if (!roomEntry) {
      roomEntry = {
        roomName: a.room.name,
        building: a.room.building,
        floor: a.room.floor,
        startSeat: a.student.seatNo || a.student.rollNo,
        endSeat: a.student.seatNo || a.student.rollNo,
        count: 0,
      };
      directory[pCode].rooms.push(roomEntry);
    }

    roomEntry.count++;
    if (a.student.seatNo) {
      roomEntry.endSeat = a.student.seatNo;
    }
  });

  const formattedDate = new Date(examDate).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Screen action bar */}
      <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Link
          href={`/theory/seating?date=${examDate}&slot=${slot}`}
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Seating Management
        </Link>

        <PrintButton label="Print Notice Board Master" />
      </div>

      {/* Printable Master Notice Board Display */}
      <div className="bg-white p-8 border border-slate-300 shadow-sm rounded-lg print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900">
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
          <div className="text-xs font-bold tracking-wider uppercase text-slate-600">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <h1 className="text-lg font-black uppercase tracking-tight text-slate-950 mt-1">
            {institute?.name} (CENTRE: {institute?.code})
          </h1>
          <div className="text-sm font-bold text-slate-800 mt-0.5">
            CENTRE-WISE NOTICE BOARD SEATING DISPLAY • {activeSession?.name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border border-slate-400 p-2 text-xs font-semibold mb-6 bg-slate-50">
          <div>
            <span className="text-slate-500">EXAM DATE:</span> {formattedDate}
          </div>
          <div className="text-right">
            <span className="text-slate-500">SESSION SLOT:</span> {slot} (
            {slot === "MORNING" ? "09:30 AM – 12:30 PM" : "02:00 PM – 05:00 PM"})
          </div>
        </div>

        {/* Directory Tables per Paper */}
        <div className="space-y-6">
          {Object.values(directory).map((d) => (
            <div key={d.paperCode} className="border border-slate-400 rounded overflow-hidden">
              <div className="bg-slate-800 text-white p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold bg-white text-slate-900 px-2 py-0.5 rounded">
                    {d.paperCode}
                  </span>
                  <span className="font-bold">{d.paperName}</span>
                  <span className="text-slate-300 font-mono text-[11px]">({d.schemeString})</span>
                </div>
                <div className="font-semibold text-slate-200">
                  Total Students: {d.totalCount}
                </div>
              </div>

              <table className="w-full text-xs">
                <thead className="bg-slate-100 border-b border-slate-400 font-bold text-slate-800">
                  <tr>
                    <th className="p-2 border-r border-slate-400 text-left">Room / Block</th>
                    <th className="p-2 border-r border-slate-400 text-left">Building & Floor</th>
                    <th className="p-2 border-r border-slate-400 text-center font-mono">
                      Allocated Seat Numbers (From – To)
                    </th>
                    <th className="p-2 text-center">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {d.rooms.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-400 font-bold text-slate-900">
                        {r.roomName}
                      </td>
                      <td className="p-2 border-r border-slate-400 text-slate-600">
                        {r.building} • Floor {r.floor}
                      </td>
                      <td className="p-2 border-r border-slate-400 text-center font-mono font-bold text-sm text-blue-900">
                        {r.startSeat} – {r.endSeat}
                      </td>
                      <td className="p-2 text-center font-bold">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {Object.keys(directory).length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No seating data found for this date.
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-400 flex justify-between text-xs font-bold text-slate-800">
          <div>Notice Board Copy</div>
          <div>Exam Cell In-Charge</div>
          <div>Principal & Chief Superintendent</div>
        </div>
      </div>
    </div>
  );
}
