import { requireTenantAuth, getTenantInstitute, isTenantReadOnly } from "@/lib/tenant";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireTenantAuth();
  const institute = await getTenantInstitute(session.instituteId);
  const activeSession = institute?.sessions?.[0];

  const readOnly = institute ? isTenantReadOnly(institute) : false;
  let daysUntilExpiry: number | null = null;
  if (institute?.validUntil) {
    daysUntilExpiry = Math.ceil(
      (new Date(institute.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar userRole={session.role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          instituteCode={session.instituteCode || ""}
          examCentreCode={institute?.examCentreCode || session.examCentreCode}
          instituteName={institute?.name || session.instituteName || "ExamOps"}
          sessionCode={activeSession?.code}
          sessionName={activeSession?.name}
          userName={session.name}
          userRole={session.role}
          impersonatedByEmail={session.impersonatedByEmail}
          isReadOnly={readOnly}
          daysUntilExpiry={daysUntilExpiry}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
