import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPostExamSlotData } from "@/lib/reports/post-exam-data";

export const dynamic = "force-dynamic";

export default async function MarksheetsReportPage() {
  const data = await getPostExamSlotData(1, "MORNING");

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <PrintToolbar
        title="Marksheet Number Report"
        subtitle={`${data.marksheets.length} records`}
        exportUrl="/api/reports/export?type=marksheets"
      />

      <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <div className="text-xs font-bold uppercase">
            MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI
          </div>
          <div className="text-sm font-extrabold uppercase mt-0.5">MARKSHEET NUMBER REPORT</div>
          <div className="text-xs">
            Centre: {data.institute?.examCentreCode ?? data.institute?.code} — {data.institute?.name} ({data.activeSession?.name})
          </div>
        </div>

        {data.marksheets.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No marksheet records imported yet. Import theory marksheet data in Portal Imports.
          </div>
        ) : (
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black px-2 py-1">Sr.</th>
                <th className="border border-black px-2 py-1">Seat No</th>
                <th className="border border-black px-2 py-1">Subject Code</th>
                <th className="border border-black px-2 py-1">Marksheet No</th>
                <th className="border border-black px-2 py-1">Marks</th>
                <th className="border border-black px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.marksheets.map((m, i) => (
                <tr key={m.id}>
                  <td className="border border-black px-2 py-1 text-center">{i + 1}</td>
                  <td className="border border-black px-2 py-1 font-mono">{m.seatNo}</td>
                  <td className="border border-black px-2 py-1">{m.subjectCode}</td>
                  <td className="border border-black px-2 py-1 font-mono">{m.marksheetNo}</td>
                  <td className="border border-black px-2 py-1 text-center">{m.marks ?? "-"}</td>
                  <td className="border border-black px-2 py-1 text-center">{m.status ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
