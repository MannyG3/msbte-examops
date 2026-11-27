import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPreExamSlotData, formatMsbteDate } from "@/lib/reports/pre-exam-data";
import { withTenant } from "@/lib/prisma";

function csvCell(val: unknown): string {
  const s = String(val ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.instituteId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "qp-requirement";
    const day = Number(searchParams.get("day") || "1");
    const slot = (searchParams.get("slot") || "MORNING") as "MORNING" | "AFTERNOON";

    let rows: string[][] = [];
    let filename = `${type}-day${day}-${slot}.csv`;

    if (type === "duty-chart") {
      filename = `duty-chart.csv`;
      const duties = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
        const active = await tx.examSession.findFirst({
          where: { instituteId: session.instituteId! },
          orderBy: { createdAt: "desc" },
        });
        if (!active) return [];
        return tx.supervisionDuty.findMany({
          where: { sessionId: active.id },
          include: { staff: true, block: { include: { room: true } } },
          orderBy: [{ examDay: "asc" }, { slot: "asc" }, { role: "asc" }],
        });
      });
      rows.push(["Day", "Date", "Slot", "Role", "Block", "Room", "Staff Name", "Department", "Designation"]);
      for (const d of duties) {
        rows.push([
          String(d.examDay),
          formatMsbteDate(d.examDate),
          d.slot,
          d.role,
          d.block ? `Block ${d.block.blockNo}` : "All",
          d.block?.room.roomNo ?? "-",
          d.staff.name,
          d.staff.department,
          d.staff.designation,
        ]);
      }
    } else {
      const data = await getPreExamSlotData(day, slot);
      if (type === "qp-requirement") {
        rows.push(["Day", "Date", "Slot", "C-S-M", "Subject Code", "Subject Name", "Abbreviation", "Time", "Candidates / QPs Required"]);
        for (const e of data.entries) {
          rows.push([
            String(e.examDay),
            formatMsbteDate(e.examDate),
            e.slot,
            e.csm,
            e.subject.code,
            e.subject.name,
            e.subject.abbreviation,
            e.timeRange,
            String(e._count.papers),
          ]);
        }
      } else if (type === "supervisor-allocation") {
        rows.push(["Day", "Slot", "Role", "Block No", "Room No", "Staff Name", "Department", "Override"]);
        for (const d of data.duties) {
          rows.push([
            String(d.examDay),
            d.slot,
            d.role,
            d.block ? String(d.block.blockNo) : "All",
            d.block?.room.roomNo ?? "-",
            d.staff.name,
            d.staff.department,
            d.isOverride ? "YES" : "NO",
          ]);
        }
      } else {
        // bench / attendance / gate
        rows.push(["Block No", "Bench No", "Column", "Row", "Seat No", "C-S-M", "Subject Code", "Detained"]);
        const blockNoMap = new Map(data.blocks.map((b) => [b.id, b.blockNo]));
        for (const a of data.allocations) {
          rows.push([
            String(blockNoMap.get(a.blockId) ?? ""),
            String(a.benchNo),
            String(a.columnNo),
            String(a.rowNo),
            a.candidatePaper.candidate.seatNo,
            a.candidatePaper.timetableEntry.csm,
            a.candidatePaper.timetableEntry.subject.code,
            a.candidatePaper.isDetained || a.candidatePaper.candidate.isDetained ? "DET" : "",
          ]);
        }
      }
    }

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
