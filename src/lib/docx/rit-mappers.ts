import { formatMsbteDate } from "@/lib/reports/pre-exam-data";

export function formatDateSlash(d?: Date | string | null): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-GB"); // DD/MM/YYYY
}

export function formatTimeDots(timeRange: string): string {
  return timeRange.replace(/:/g, ".").replace(/A\.M\./gi, "AM").replace(/P\.M\./gi, "PM");
}

export function formatTimeShort(timeRange: string): string {
  return formatTimeDots(timeRange).replace(/\s*(AM|PM)/gi, "").trim();
}

export function toCompactCsm(dashed: string): string {
  return dashed.replace(/-/g, "").toUpperCase();
}

export const RIT_FORMAT_FILES = {
  BENCH_AND_GATE: "Gate_Chart_and_Bench_Arrangement_30-11-2026_Morning.docx",
  ATTENDANCE: "Attendance_Report_30-11-2026_Morning.docx",
  SUPERVISOR: "Supervisor_Report_30-11-2026_Morning.docx",
  PACKING_SLIP: "Packing_Slip_2026-11-27_Afternoon.docx",
  FORMAT_3A: "25-11_Aft.docx",
  ANNEXURE_G: "Format_3g_2026-11-27.docx",
  FORMAT_02: "Format_No_02_2026-11-23.docx",
} as const;

export function buildCommonReportContext(params: {
  institute: {
    code: string;
    examCentreCode: string | null;
    name: string;
    nameUpper: string | null;
    nameTitleCase: string | null;
    oicFullName: string | null;
    oicShortName: string | null;
    oicPhone: string | null;
    dcCode: string;
  } | null;
  sessionName: string;
  examDay: number;
  examDate: Date | string | null;
  slot: "MORNING" | "AFTERNOON";
  summaryLine: string;
}) {
  const ecCode = params.institute?.examCentreCode ?? params.institute?.code ?? "1227";
  const sessionTitle = params.slot === "MORNING" ? "Morning" : "Afternoon";
  return {
    ecCode,
    instCode: params.institute?.code ?? ecCode,
    dcCode4: (params.institute?.dcCode ?? "0710").padStart(4, "0"),
    instituteUpper: params.institute?.nameUpper ?? params.institute?.name?.toUpperCase() ?? "",
    instituteTitleCase: params.institute?.nameTitleCase ?? params.institute?.name ?? "",
    examName: params.sessionName,
    examNoHyphen: params.sessionName.replace(/-/g, " "),
    examDay: String(params.examDay),
    day2: String(params.examDay).padStart(2, "0"),
    dateDDMMYYYY: formatMsbteDate(params.examDate),
    dateSlash: formatDateSlash(params.examDate),
    sessionTitle,
    sessionUpper: params.slot,
    oicFull: params.institute?.oicFullName ?? "Javed Babubhai Shaikh",
    oicShort: params.institute?.oicShortName ?? "J. B. Shaikh",
    oicPhone: params.institute?.oicPhone ?? "",
    summaryLine: params.summaryLine,
  };
}
