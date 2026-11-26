import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  const activeSession = await prisma.examSession.findFirst({
    where: { instituteId: session.instituteId, isCurrent: true },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar userRole={session.role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          instituteCode={session.instituteCode}
          instituteName={session.instituteName}
          sessionCode={activeSession?.code}
          sessionName={activeSession?.name}
          userName={session.name}
          userRole={session.role}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
