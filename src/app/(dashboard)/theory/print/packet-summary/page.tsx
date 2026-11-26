import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/shared/print-button";

export default async function PacketSummaryPage(props: {
  searchParams?: Promise<{ date?: string; slot?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireAuth();

  const examDate = searchParams?.date || "2026-11-17";
  const slot = (searchParams?.slot || "MORNING").toUpperCase();
  const parsedDate = new Date(examDate);

  const [institute, activeSession, rooms] = await Promise.all([
    prisma.institute.findUnique({ where: { id: session.instituteId } }),
    prisma.examSession.findFirst({
      where: { instituteId: session.instituteId, isCurrent: true },
    }),
    prisma.room.findMany({
      where: { instituteId: session.instituteId },
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
            paper: true,
            student: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeRooms = rooms.filter((r) => r.seatingAllocations.length > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Link
          href={`/theory/seating?date=${examDate}&slot=${slot}`}
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Seating
        </Link>

        <PrintButton label="Print Packet Summary" />
      </div>

      <div className="bg-white p-8 border border-slate-300 shadow-sm rounded-lg print:border-none print:shadow-none text-slate-900">
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
          <div className="text-xs font-bold tracking-wider uppercase text-slate-600">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <h1 className="text-lg font-black uppercase text-slate-950 mt-1">
            {institute?.name} ({institute?.code})
          </h1>
          <div className="text-sm font-bold text-slate-800">
            EXAM DAY ANSWER BOOK PACKET ISSUE & RECEIPT SUMMARY
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border border-slate-400 p-2 text-xs font-semibold mb-4 bg-slate-50">
          <div>DATE: {examDate}</div>
          <div className="text-right">SLOT: {slot}</div>
        </div>

        <table className="w-full text-xs border border-slate-400">
          <thead className="bg-slate-100 border-b border-slate-400 font-bold">
            <tr>
              <th className="p-2 border-r border-slate-400 text-left">Room / Block</th>
              <th className="p-2 border-r border-slate-400 text-left">Subject Code(s)</th>
              <th className="p-2 border-r border-slate-400 text-center">Books Issued</th>
              <th className="p-2 border-r border-slate-400 text-center">Books Returned</th>
              <th className="p-2 border-r border-slate-400 text-center">Absentees</th>
              <th className="p-2 text-center">Supervisor Signature</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {activeRooms.map((room) => {
              const paperCodes = Array.from(
                new Set(room.seatingAllocations.map((a) => a.paper.paperCode))
              ).join(", ");

              return (
                <tr key={room.id}>
                  <td className="p-2.5 border-r border-slate-400 font-bold">{room.name}</td>
                  <td className="p-2.5 border-r border-slate-400 font-mono font-semibold">
                    {paperCodes}
                  </td>
                  <td className="p-2.5 border-r border-slate-400 text-center font-bold">
                    {room.seatingAllocations.length}
                  </td>
                  <td className="p-2.5 border-r border-slate-400 text-center">______</td>
                  <td className="p-2.5 border-r border-slate-400 text-center">______</td>
                  <td className="p-2.5 text-center">________________</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
