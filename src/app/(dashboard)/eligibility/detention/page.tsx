import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { DetentionClient } from "./detention-client";

export default async function EligibilityDetentionPage() {
  const session = await requireAuth();

  const [institute, rule, detainedStudents, totalStudents, attendanceCount] = await Promise.all([
    prisma.institute.findUnique({ where: { id: session.instituteId } }),
    prisma.eligibilityRule.findFirst({ where: { instituteId: session.instituteId } }),
    prisma.student.findMany({
      where: { instituteId: session.instituteId, status: "DETAINED" },
      include: { division: true, programme: true },
      orderBy: [{ semester: "asc" }, { rollNo: "asc" }],
    }),
    prisma.student.count({ where: { instituteId: session.instituteId } }),
    prisma.attendanceRecord.count({
      where: { student: { instituteId: session.instituteId } },
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <DetentionClient
        institute={JSON.parse(JSON.stringify(institute))}
        rule={rule ? JSON.parse(JSON.stringify(rule)) : { minAttendancePct: 75, enforceFaPrPass: true }}
        detainedStudents={JSON.parse(JSON.stringify(detainedStudents))}
        totalStudents={totalStudents}
        attendanceCount={attendanceCount}
      />
    </div>
  );
}
