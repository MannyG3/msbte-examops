export interface ParsedScheme {
  programme: string;
  semester: number;
  scheme: string;
  raw: string;
  isValid: boolean;
}

/**
 * Parses MSBTE scheme strings like "CO-5-K", "EE-3-I", "IF 5 K", "ME_1_K", "CO5K"
 */
export function parseSchemeString(rawString: string): ParsedScheme {
  if (!rawString) {
    return { programme: "", semester: 0, scheme: "", raw: "", isValid: false };
  }

  const cleaned = rawString.trim().toUpperCase();

  // Pattern 1: Standard delimiter "CO-5-K", "EE_3_I", "IF 5 K"
  const delimiterMatch = cleaned.match(/^([A-Z]{2,4})[\s\-_/]+([1-6])[\s\-_/]+([A-Z0-9]+)$/);
  if (delimiterMatch) {
    return {
      programme: delimiterMatch[1],
      semester: parseInt(delimiterMatch[2], 10),
      scheme: delimiterMatch[3],
      raw: rawString,
      isValid: true,
    };
  }

  // Pattern 2: Compact "CO5K", "IF3I"
  const compactMatch = cleaned.match(/^([A-Z]{2,4})([1-6])([A-Z0-9]+)$/);
  if (compactMatch) {
    return {
      programme: compactMatch[1],
      semester: parseInt(compactMatch[2], 10),
      scheme: compactMatch[3],
      raw: rawString,
      isValid: true,
    };
  }

  // Fallback: try to find letters, digit 1-6, and letters
  const looseMatch = cleaned.match(/([A-Z]{2,4}).*?([1-6]).*?([A-Z])/);
  if (looseMatch) {
    return {
      programme: looseMatch[1],
      semester: parseInt(looseMatch[2], 10),
      scheme: looseMatch[3],
      raw: rawString,
      isValid: true,
    };
  }

  return {
    programme: cleaned.slice(0, 2),
    semester: 1,
    scheme: "K",
    raw: rawString,
    isValid: false,
  };
}

export interface TimetableRowInput {
  day?: string;
  examDate: string; // YYYY-MM-DD or DD-MM-YYYY
  slot: "MORNING" | "AFTERNOON";
  startTime?: string;
  endTime?: string;
  paperCode: string;
  paperName: string;
  schemeString: string;
}

/**
 * Normalizes time slots:
 * Morning default: 09:30 AM to 12:30 PM
 * Afternoon default: 02:00 PM to 05:00 PM
 */
export function normalizeTimeSlot(slot: string, customStart?: string, customEnd?: string) {
  const isMorning = slot.toUpperCase().startsWith("M");
  return {
    slot: (isMorning ? "MORNING" : "AFTERNOON") as "MORNING" | "AFTERNOON",
    startTime: customStart || (isMorning ? "09:30 AM" : "02:00 PM"),
    endTime: customEnd || (isMorning ? "12:30 PM" : "05:00 PM"),
  };
}

/**
 * Parse raw pasted timetable rows (tab-separated or comma-separated)
 */
export function parsePastedTimetable(text: string): TimetableRowInput[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const rows: TimetableRowInput[] = [];

  for (const line of lines) {
    // Skip obvious header lines
    if (line.toLowerCase().includes("subject code") || line.toLowerCase().includes("scheme")) {
      continue;
    }

    // Split by tab or multiple spaces or comma
    const parts = line.includes("\t")
      ? line.split("\t")
      : line.includes(",")
      ? line.split(",")
      : line.split(/\s{2,}/);

    if (parts.length >= 4) {
      // Formats commonly found:
      // Date | Slot | Subject Code | Subject Name | Scheme
      // or Exam Day | Date | Slot | Subject Code | Subject Name | Scheme
      const datePart = parts[0].trim();
      const slotPart = parts[1].trim();
      const codePart = parts[2].trim();
      const namePart = parts[3].trim();
      const schemePart = parts[4]?.trim() || "CO-1-K";

      const slotNorm = normalizeTimeSlot(slotPart);

      rows.push({
        examDate: datePart,
        slot: slotNorm.slot,
        startTime: slotNorm.startTime,
        endTime: slotNorm.endTime,
        paperCode: codePart,
        paperName: namePart,
        schemeString: schemePart,
      });
    }
  }

  return rows;
}
