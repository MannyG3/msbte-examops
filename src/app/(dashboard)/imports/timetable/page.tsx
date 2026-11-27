import { MsbteImporter } from "@/components/imports/msbte-importer";

export default function TimetableImportPage() {
  return (
    <MsbteImporter
      sourceType="TIMETABLE"
      title="1. Exam Center-wise Time Table Importer"
      description="Paste or upload MSBTE's Exam Center-wise Time Table rows (Day, Date, M/A Slot, Time Slot, Subject Code, Subject Name, C-S-M)."
      fields={[
        { key: "examDay", label: "Exam Day", required: true, aliases: ["day", "examday"] },
        { key: "examDate", label: "Date (DD-MM-YYYY)", required: true, aliases: ["date", "examdate"] },
        { key: "slot", label: "Session (M / A)", required: true, aliases: ["session", "slot", "ma"] },
        { key: "timeRange", label: "Time Slot", required: false, aliases: ["time", "timerange", "slot"] },
        { key: "subjectCode", label: "Subject Code", required: true, aliases: ["subjectcode", "subcode", "code"] },
        { key: "subjectName", label: "Subject Name", required: false, aliases: ["subjectname", "subname", "title"] },
        { key: "csm", label: "C-S-M (e.g. CO-3-K)", required: true, aliases: ["csm", "scheme", "course"] },
      ]}
      sampleCsv={`Day,Date,Session,Time,Subject_Code,Subject_Name,C-S-M
8,26-11-2026,Afternoon,02:00 P.M. to 05:00 P.M.,313303,DIGITAL TECHNIQUES,CO-3-K
8,26-11-2026,Morning,09:30 A.M. to 12:30 P.M.,315319,OPERATING SYSTEMS,CO-5-K`}
    />
  );
}
