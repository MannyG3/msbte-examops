import { describe, it, expect } from "vitest";
import {
  parseCsm,
  cleanSubCode,
  decodeWindows1252,
  parseMsbteTimetableCsv,
  parseMsbteSeatingCsv,
  padDcCode,
} from "./msbte-parsers";

describe("MSBTE Portal Parsers (RIT 1227 Fixtures)", () => {
  it("parses compact and dashed C-S-M notations", () => {
    expect(parseCsm("CO5K")).toEqual({
      courseCode: "CO",
      semOrYear: "5",
      masterCode: "K",
      compact: "CO5K",
      dashed: "CO-5-K",
    });
    expect(parseCsm("PCE6F")?.dashed).toBe("PCE-6-F");
    expect(parseCsm("CE-2-I")?.compact).toBe("CE2I");
  });

  it("strips stray 0xFF bytes from Sub Code and decodes Windows-1252", () => {
    const rawBytes = new Uint8Array([0xff, 0x32, 0x32, 0x32, 0x30, 0x34]); // \xff22204
    const decoded = decodeWindows1252(rawBytes);
    expect(cleanSubCode(decoded)).toBe("22204");
    expect(padDcCode("710")).toBe("0710");
  });

  it("carries forward marker dates and handles continuation rows in TIMETABLE1.csv", () => {
    const sample = `
Time Table for MSBTE Winter 2026 Theory Examination FINAL
K.E.SOCIETY\\'S RAJARAMBAPU INSTITUTE OF TECHNOLOGY (POLYTECHNIC) - 1227
?? Date: 17-11-2026 | ?? Afternoon | ?? Day: 1
Sr No.,Day,Session,Time Slot,Subject Code,Subject Name,scheme
1,1,A,02:00 P.M. to 05:00 P.M.,313308,MECHANICS OF STRUCTURES,CE3I
,1,A,02:00 P.M. to 05:00 P.M.,313308,STRENGTH OF MATERIAL,"CE3K,ME3K"
Important Instructions
1. Reach 30 mins early.
`;
    const res = parseMsbteTimetableCsv(sample);
    expect(res.examName).toBe("Winter-2026");
    expect(res.centreLine).toContain("K.E.SOCIETY'S");
    expect(res.rows).toHaveLength(3);
    expect(res.rows[0].examDate).toBe("17-11-2026");
    expect(res.rows[1].isContinuation).toBe(true);
    expect(res.rows[1].subjectName).toBe("STRENGTH OF MATERIAL");
    expect(res.rows[2].csm).toBe("ME-3-K");
    expect(res.instructions.length).toBe(2);
  });

  it("parses two-row header seating CSV, infers date/slot from filename, and skips empty trailing rows", () => {
    const csv = `Sr ,Seat No.,Inst Code,Course Code,Year Code,Master Code,Sub Code
No.,,,,,,
1,250009,1227,CE,2,I,\u00ff22204
1,250704,1227,ME,2,I,22204\u00ff
,,,,,,
`;
    const res = parseMsbteSeatingCsv(csv, "30-11_MOR.csv");
    expect(res.inferredDayMonth).toBe("30-11");
    expect(res.inferredSlot).toBe("MORNING");
    expect(res.rows).toHaveLength(2);
    expect(res.fixed).toBe(2);
    expect(res.rows[0].csm).toBe("CE-2-I");
    expect(res.rows[0].subjectCode).toBe("22204");
  });
});
