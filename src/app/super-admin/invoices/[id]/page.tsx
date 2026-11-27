import { requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PrintToolbar } from "@/components/reports/print-toolbar";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { institute: true },
  });

  if (!inv) {
    return <div className="p-8 text-center text-sm text-slate-500">Invoice not found.</div>;
  }

  return (
    <div className="max-w-[210mm] mx-auto p-6 space-y-6">
      <PrintToolbar
        title={`Tax Invoice ${inv.invoiceNumber}`}
        backHref="/super-admin/invoices"
      />

      <div className="bg-white border border-slate-300 p-8 shadow-sm print:shadow-none print:border-none text-black space-y-6">
        <div className="flex justify-between items-start border-b-2 border-black pb-4">
          <div>
            <h2 className="text-lg font-extrabold uppercase">{inv.companyName}</h2>
            <p className="text-xs text-slate-600">Maharashtra, India · MSBTE ExamOps SaaS</p>
          </div>
          <div className="text-right text-xs">
            <div className="text-base font-bold">TAX INVOICE</div>
            <div><strong>Invoice #:</strong> {inv.invoiceNumber}</div>
            <div><strong>Date:</strong> {new Date(inv.issuedAt).toLocaleDateString("en-GB").replace(/\//g, "-")}</div>
            <div><strong>Status:</strong> {inv.status}</div>
          </div>
        </div>

        <div className="text-xs space-y-1">
          <div className="font-bold uppercase text-slate-500">Billed To:</div>
          <div className="font-bold text-sm">{inv.institute.name} (Code: {inv.institute.code})</div>
          <div>{inv.institute.address}</div>
          <div>{inv.institute.contactEmail || ""}</div>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-3 py-2 text-left">Description</th>
              <th className="border border-black px-3 py-2 text-right">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2">{inv.notes || "ExamOps SaaS Subscription"}</td>
              <td className="border border-black px-3 py-2 text-right">₹{inv.amountInr.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2">IGST / CGST+SGST @ 18%</td>
              <td className="border border-black px-3 py-2 text-right">₹{inv.gstInr.toLocaleString("en-IN")}</td>
            </tr>
            <tr className="bg-slate-100 font-bold text-sm">
              <td className="border border-black px-3 py-2 text-right">TOTAL PAYABLE</td>
              <td className="border border-black px-3 py-2 text-right">₹{inv.totalInr.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-xs border border-black p-3 bg-slate-50">
          <strong>Bank Transfer Details:</strong> Pay via NEFT/RTGS/UPI to {inv.companyName}. Mention Invoice #{inv.invoiceNumber} in remarks.
        </div>
      </div>
    </div>
  );
}
