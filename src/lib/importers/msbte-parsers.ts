import Papa from "papaparse";

export interface ParsedCsm {
  courseCode: string;
  semOrYear: string;
  masterCode: string;
  compact: string; // CO5K
  dashed: string; // CO-5-K
}

/**
 * Parses compact or dashed C-S-M strings (e.g. "CO5K", "PCE6F", "CO-5-K") into normalized parts.
 */
export function parseCsm(raw: string): ParsedCsm | null {
  const cleaned = String(raw || "").trim().toUpperCase();
  if (!cleaned) return null;

  const dashedMatch = cleaned.match(/^([A-Z]+)-(\d+)-([A-Z])$/);
  if (dashedMatch) {
    const [, courseCode, semOrYear, masterCode] = dashedMatch;
    return {
      courseCode,
      semOrYear,
      masterCode,
      compact: `${courseCode}${semOrYear}${masterCode}`,
      dashed: `${courseCode}-${semOrYear}-${masterCode}`,
    };
  }

  const compactMatch = cleaned.match(/^([A-Z]+)(\d)([A-Z])$/);
  if (compactMatch) {
    const [, courseCode, semOrYear, masterCode] = compactMatch;
    return {
      courseCode,
      semOrYear,
      masterCode,
      compact: `${courseCode}${semOrYear}${masterCode}`,
      dashed: `${courseCode}-${semOrYear}-${masterCode}`,
    };
  }

  return null;
}

/**
 * Decodes Windows-1252/Latin-1 bytes cleanly to UTF-8 string.
 */
export function decodeWindows1252(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return new TextDecoder("windows-1252").decode(bytes);
}

/**
 * Strips stray 0xFF bytes (ÿ in Windows-1252) and non-digits from Sub Code.
 */
export function cleanSubCode(raw: string): string {
  return String(raw || "")
    .replace(/\u00ff/gi, "")
    .replace(/\D/g, "")
    .trim();
}

export interface ParsedTimetableRow {
  examDay: number;
  examDate: string; // DD-MM-YYYY
  slot: "MORNING" | "AFTERNOON";
  timeRange: string;
  subjectCode: string;
  subjectName: string;
  csm: string; // dashed e.g. CE-3-I
  compactCsm: string; // CE3I
  isContinuation: boolean;
}

export interface TimetableParseResult {
  examName: string | null;
  centreLine: string | null;
  instructions: string[];
  rows: ParsedTimetableRow[];
  accepted: number;
  fixed: number;
  rejected: number;
}

/**
 * Parses MSBTE TIMETABLE1.csv:
 * - Carries forward Date from `?? Date: 17-11-2026 | ?? Afternoon | ?? Day: 1`
 * - Handles continuation rows with blank Sr No sharing previous Subject Code/Time
 * - Splits comma-separated compact C-S-M schemes (`CE3K,ME3K,ME3I`)
 */
export function parseMsbteTimetableCsv(csvText: string): TimetableParseResult {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: false });
  let examName: string | null = null;
  let centreLine: string | null = null;
  const instructions: string[] = [];
  const rows: ParsedTimetableRow[] = [];

  let currentDate = "";
  let currentSlot: "MORNING" | "AFTERNOON" = "MORNING";
  let currentDay = 0;
  let lastSrSubjectCode = "";
  let lastSrTimeSlot = "";
  let inInstructions = false;

  let accepted = 0;
  let fixed = 0;
  let rejected = 0;

  for (const rawCols of parsed.data) {
    const cols = rawCols.map((c) => String(c ?? "").trim());
    const joined = cols.filter(Boolean).join(" ").trim();
    if (!joined) continue;

    if (joined.includes("Important Instructions")) {
      inInstructions = true;
      instructions.push(joined);
      continue;
    }
    if (inInstructions) {
      instructions.push(joined);
      continue;
    }

    if (/Time Table for MSBTE/i.test(joined)) {
      const m = joined.match(/MSBTE\s+([A-Za-z]+)\s+(\d{4})/i);
      if (m) examName = `${m[1]}-${m[2]}`;
      continue;
    }

    if (/-\s*\d{4}$/.test(joined) && joined.length > 10 && !joined.includes("Date:")) {
      centreLine = joined.replace(/\\'/g, "'");
      continue;
    }

    // Session marker: ?? Date: 17-11-2026 | ?? Afternoon | ?? Day: 1
    if (joined.includes("Date:") && joined.includes("Day:")) {
      const dm = joined.match(/Date:\s*(\d{2}-\d{2}-\d{4})/i);
      const sm = joined.match(/\b(Morning|Afternoon)\b/i);
      const dayM = joined.match(/Day:\s*(\d+)/i);
      if (dm) currentDate = dm[1];
      if (sm) currentSlot = sm[1].toUpperCase() === "AFTERNOON" ? "AFTERNOON" : "MORNING";
      if (dayM) currentDay = parseInt(dayM[1], 10);
      continue;
    }

    // Repeated header row
    if (cols[0]?.toLowerCase().startsWith("sr no")) {
      continue;
    }

    // Data row: Sr No.,Day,Session,Time Slot,Subject Code,Subject Name,scheme
    if (cols.length >= 7) {
      const srNo = cols[0];
      const dayVal = parseInt(cols[1], 10);
      const sessChar = cols[2].toUpperCase();
      const timeSlot = cols[3] || lastSrTimeSlot;
      const subCode = cleanSubCode(cols[4]) || lastSrSubjectCode;
      const subName = cols[5];
      const schemeList = cols[6];

      const isContinuation = !srNo && Boolean(subCode);
      if (srNo && /^\d+$/.test(srNo)) {
        lastSrSubjectCode = subCode;
        lastSrTimeSlot = timeSlot;
      }

      if (!subCode || !schemeList) {
        if (cols.some(Boolean)) rejected++;
        continue;
      }

      const effectiveDay = Number.isFinite(dayVal) ? dayVal : currentDay;
      const effectiveSlot: "MORNING" | "AFTERNOON" =
        sessChar === "A" ? "AFTERNOON" : sessChar === "M" ? "MORNING" : currentSlot;

      const schemeTokens = schemeList
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      for (const tok of schemeTokens) {
        const csm = parseCsm(tok);
        if (!csm) {
          rejected++;
          continue;
        }
        rows.push({
          examDay: effectiveDay,
          examDate: currentDate,
          slot: effectiveSlot,
          timeRange: timeSlot,
          subjectCode: subCode,
          subjectName: subName.toUpperCase(),
          csm: csm.dashed,
          compactCsm: csm.compact,
          isContinuation,
        });
        if (isContinuation) fixed++;
        else accepted++;
      }
    }
  }

  return { examName, centreLine, instructions, rows, accepted, fixed, rejected };
}

export interface ParsedSeatingRow {
  srNo: number;
  seatNo: string;
  instCode: string;
  courseCode: string;
  semOrYear: string;
  masterCode: string;
  csm: string; // dashed
  subjectCode: string;
  importRowOrder: number;
}

export interface SeatingParseResult {
  inferredDayMonth: string | null;
  inferredSlot: "MORNING" | "AFTERNOON" | null;
  rows: ParsedSeatingRow[];
  accepted: number;
  fixed: number;
  rejected: number;
}

/**
 * Parses MSBTE Seating Arrangement CSV (Windows-1252, two-row header, stray 0xFF in Sub Code, empty trailing rows).
 */
export function parseMsbteSeatingCsv(csvText: string, filename?: string): SeatingParseResult {
  let inferredDayMonth: string | null = null;
  let inferredSlot: "MORNING" | "AFTERNOON" | null = null;

  if (filename) {
    const fnMatch = filename.match(/(\d{2}-\d{2})_(MOR|AFT)/i);
    if (fnMatch) {
      inferredDayMonth = fnMatch[1];
      inferredSlot = fnMatch[2].toUpperCase() === "AFT" ? "AFTERNOON" : "MORNING";
    }
  }

  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const rows: ParsedSeatingRow[] = [];
  let accepted = 0;
  let fixed = 0;
  let rejected = 0;

  for (let i = 0; i < parsed.data.length; i++) {
    const cols = parsed.data[i].map((c) => String(c ?? "").trim());
    if (cols.every((c) => !c)) continue;

    // Two-row header
    const first = cols[0].toLowerCase();
    if (first.startsWith("sr") || first === "no." || cols[1]?.toLowerCase().includes("seat no")) {
      continue;
    }

    const srNo = parseInt(cols[0], 10);
    const seatNo = cols[1];
    const instCode = cols[2];
    const courseCode = cols[3]?.toUpperCase();
    const semOrYear = cols[4];
    const masterCode = cols[5]?.toUpperCase();
    const rawSub = cols[6] ?? "";
    const subjectCode = cleanSubCode(rawSub);

    if (!seatNo || !subjectCode || !courseCode) {
      rejected++;
      continue;
    }

    const hadStrayBytes = rawSub !== subjectCode;
    if (hadStrayBytes) fixed++;
    else accepted++;

    rows.push({
      srNo: Number.isFinite(srNo) ? srNo : rows.length + 1,
      seatNo,
      instCode,
      courseCode,
      semOrYear,
      masterCode,
      csm: `${courseCode}-${semOrYear}-${masterCode}`,
      subjectCode,
      importRowOrder: rows.length + 1,
    });
  }

  return { inferredDayMonth, inferredSlot, rows, accepted, fixed, rejected };
}

/**
 * Pads DC code to 4 digits (e.g. "710" -> "0710").
 */
export function padDcCode(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.padStart(4, "0");
}
