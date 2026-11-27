import { requireTenantAuth } from "@/lib/tenant";
import { withTenant } from "@/lib/prisma";
import { DEFAULT_REPORT_TEMPLATES } from "@/lib/reports/default-templates";
import { TemplateViewerClient } from "./template-viewer-client";
import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export const dynamic = "force-dynamic";

export default async function ReportTemplatePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  const session = await requireTenantAuth();

  const data = await withTenant(session.instituteId, session.isSuperAdmin, async (tx) => {
    const [institute, activeSession, customTemplate] = await Promise.all([
      tx.institute.findUnique({ where: { id: session.instituteId } }),
      tx.examSession.findFirst({
        where: { instituteId: session.instituteId },
        orderBy: { createdAt: "desc" },
      }),
      tx.reportTemplate.findFirst({
        where: { instituteId: session.instituteId, key: upperKey, isActive: true },
        orderBy: { version: "desc" },
      }),
    ]);
    return { institute, activeSession, customTemplate };
  });

  const fallback = DEFAULT_REPORT_TEMPLATES[upperKey] ?? {
    title: upperKey,
    html: `<div style="padding:16px;border:1px solid #000;"><h2>${upperKey}</h2><p>Custom template for {{instituteName}} ({{sessionName}}).</p></div>`,
    css: "",
  };

  return (
    <TemplateViewerClient
      templateKey={upperKey}
      initialTitle={data.customTemplate?.title ?? fallback.title}
      initialHtml={data.customTemplate?.html ?? fallback.html}
      initialCss={data.customTemplate?.css ?? fallback.css ?? ""}
      version={data.customTemplate?.version ?? 1}
      variables={{
        centreCode: data.institute?.examCentreCode ?? data.institute?.code ?? "9999",
        instituteName: data.institute?.name ?? "Institute",
        sessionName: data.activeSession?.name ?? "Winter-2026",
        date: formatMsbteDate(new Date()),
      }}
    />
  );
}
