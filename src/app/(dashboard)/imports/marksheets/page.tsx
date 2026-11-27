import { MsbteImporter } from "@/components/imports/msbte-importer";

export default function MarksheetImportPage() {
  return (
    <MsbteImporter
      sourceType="MARKSHEET"
      title="4. Theory Marksheets Inventory Importer"
      description="Import theory e-marksheet exam centre inventory report for post-exam queries."
      fields={[
        { key: "seatNo", label: "Seat Number", required: true, aliases: ["seat", "seatno"] },
        { key: "subjectCode", label: "Subject Code", required: true, aliases: ["subjectcode", "subcode", "code"] },
        { key: "marksheetNo", label: "Marksheet Number", required: true, aliases: ["marksheet", "marksheetno", "srno"] },
        { key: "marks", label: "Marks", required: false, aliases: ["marks", "obtained"] },
        { key: "status", label: "Status", required: false, aliases: ["status", "result"] },
      ]}
      sampleCsv={`Seat_No,Subject_Code,Marksheet_No,Marks,Status
250447,313303,MS-884101,58,PASS
250448,313303,MS-884102,44,PASS`}
    />
  );
}
