import { describe, it, expect } from "vitest";
import PizZip from "pizzip";
import { buildFallbackDocxBuffer, renderDocxTemplate } from "./engine";

describe(".docx Template Engine", () => {
  it("renders placeholders into valid Word XML preserving document structure", () => {
    const template = buildFallbackDocxBuffer("BENCH ARRANGEMENT");
    const out = renderDocxTemplate(template, {
      ecCode: "1227",
      instituteUpper: "K.E.SOCIETY'S RAJARAMBAPU INSTITUTE OF TECHNOLOGY (POLYTECHNIC),Pune",
      examName: "Winter-2026",
      dateDDMMYYYY: "30-11-2026",
      sessionTitle: "Morning",
      examDay: "10",
      summaryLine: "200 candidates across 6 blocks",
      oicFull: "Javed Babubhai Shaikh",
      oicShort: "J. B. Shaikh",
    });

    const zip = new PizZip(out);
    const xml = zip.file("word/document.xml")?.asText() || "";
    expect(xml).toContain("1227");
    expect(xml).toContain("30-11-2026");
    expect(xml).toContain("J. B. Shaikh");
    expect(xml).not.toContain("{ecCode}");
  });
});
