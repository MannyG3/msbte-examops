import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { RemunerationClient } from "./remuneration-client";

export const dynamic = "force-dynamic";

const DEFAULT_RATES: Record<string, number> = {
  JUNIOR: 150,
  RELIEVER: 150,
  SENIOR: 250,
  INTERNAL_PR: 200,
  EXTERNAL_PR: 300,
};

export default async function RemunerationPage() {
  const session = await requireTenantAuth();

  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const [institute, activeSession, staff, rates, duties] = await Promise.all([
      tx.institute.findUnique({ where: { id: session.instituteId } }),
      tx.examSession.findFirst({
        where: { instituteId: session.instituteId },
        orderBy: { createdAt: "desc" },
      }),
      tx.staff.findMany({
        where: { instituteId: session.instituteId },
        orderBy: { name: "asc" },
      }),
      tx.remunerationRate.findMany({
        where: { instituteId: session.instituteId },
      }),
      tx.supervisionDuty.findMany({
        where: { instituteId: session.instituteId },
      }),
    ]);

    const rateMap: Record<string, number> = { ...DEFAULT_RATES };
    for (const r of rates) rateMap[r.role] = r.ratePerDuty;

    const bills = staff.map((st) => {
      const myDuties = duties.filter((d) => d.staffId === st.id && (!activeSession || d.sessionId === activeSession.id));
      const junior = myDuties.filter((d) => d.role === "JUNIOR").length;
      const reliever = myDuties.filter((d) => d.role === "RELIEVER").length;
      const senior = myDuties.filter((d) => d.role === "SENIOR").length;
      const totalInr =
        junior * (rateMap.JUNIOR ?? 150) +
        reliever * (rateMap.RELIEVER ?? 150) +
        senior * (rateMap.SENIOR ?? 250);
      return {
        staffId: st.id,
        name: st.name,
        department: st.department,
        designation: st.designation,
        junior,
        reliever,
        senior,
        totalDuties: myDuties.length,
        totalInr,
      };
    });

    return {
      instituteName: institute?.name ?? "",
      sessionName: activeSession?.name ?? "Active Session",
      rateMap,
      bills: bills.filter((b) => b.totalDuties > 0),
    };
  });

  return <RemunerationClient initialData={data} />;
}
