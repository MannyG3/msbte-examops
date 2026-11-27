import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seatNo = (searchParams.get("seatNo") || "").trim();
    if (!seatNo) {
      return NextResponse.json({ error: "seatNo is required" }, { status: 400 });
    }

    const allocations = await prisma.blockAllocation.findMany({
      where: {
        candidatePaper: {
          candidate: { seatNo },
        },
      },
      include: {
        block: { include: { room: true } },
        candidatePaper: {
          include: {
            candidate: true,
            timetableEntry: { include: { subject: true } },
          },
        },
      },
      orderBy: [{ examDay: "asc" }, { slot: "asc" }],
    });

    const results = allocations.map((a) => ({
      seatNo: a.candidatePaper.candidate.seatNo,
      csm: a.candidatePaper.timetableEntry.csm,
      subjectCode: a.candidatePaper.timetableEntry.subject.code,
      subjectName: a.candidatePaper.timetableEntry.subject.name,
      examDay: a.examDay,
      examDate: a.candidatePaper.timetableEntry.examDate.toISOString().slice(0, 10),
      slot: a.slot,
      timeRange: a.candidatePaper.timetableEntry.timeRange,
      blockNo: a.block.blockNo,
      roomNo: a.block.room.roomNo,
      benchNo: a.benchNo,
    }));

    return NextResponse.json({ seatNo, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
