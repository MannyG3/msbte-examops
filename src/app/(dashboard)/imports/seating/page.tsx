import { MsbteImporter } from "@/components/imports/msbte-importer";

export default function SeatingImportPage() {
  return (
    <MsbteImporter
      sourceType="SEATING_CHART"
      title="3. Seating Arrangement / Candidate List Importer"
      description="Import paper-code-wise candidates from Exam Form Module → Seating Arrangement."
      fields={[
        { key: "seatNo", label: "Seat Number", required: true, aliases: ["seat", "seatno"] },
        { key: "instCode", label: "Candidate Inst Code", required: false, aliases: ["inst", "instcode"] },
        { key: "csm", label: "C-S-M", required: true, aliases: ["csm", "course"] },
        { key: "subjectCode", label: "Subject Code", required: true, aliases: ["subjectcode", "subcode", "code"] },
        { key: "enrollmentNo", label: "Enrollment No", required: false, aliases: ["enroll", "enrollment"] },
        { key: "name", label: "Candidate Name", required: false, aliases: ["name", "studentname"] },
        { key: "isDetained", label: "Detained (Y/N)", required: false, aliases: ["detained", "det", "status"] },
      ]}
      sampleCsv={`Seat_No,Inst_Code,C-S-M,Subject_Code,Enrollment_No,Detained
250447,9999,CO-3-K,313303,2499993001,N
250448,9999,CO-3-K,313303,2499993002,N
250449,1227,CO-3-K,313303,2412273003,Y`}
    />
  );
}
