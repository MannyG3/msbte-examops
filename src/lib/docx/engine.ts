import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";

/**
 * Renders a .docx template buffer using docxtemplater with the provided data context.
 * Preserves all Word XML, fonts, margins, merged cells, and images byte-for-byte.
 */
export function renderDocxTemplate(templateBuffer: Buffer, data: Record<string, unknown>): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(data);
  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }) as Buffer;
}

/**
 * Loads a .docx template from:
 * 1) Tenant override (`docxBase64` in ReportTemplate), or
 * 2) `/reference/formats/<filename>` if present on disk, or
 * 3) Fallback minimal valid .docx built in-memory so downloads always work.
 */
export function loadOrFallbackDocxTemplate(
  referenceFilename: string,
  tenantDocxBase64?: string | null,
  fallbackTitle = "MSBTE ExamOps Report"
): { buffer: Buffer; source: "TENANT_OVERRIDE" | "REFERENCE_FILE" | "FALLBACK" } {
  if (tenantDocxBase64) {
    return { buffer: Buffer.from(tenantDocxBase64, "base64"), source: "TENANT_OVERRIDE" };
  }

  const refPath = path.join(process.cwd(), "reference", "formats", referenceFilename);
  if (fs.existsSync(refPath)) {
    return { buffer: fs.readFileSync(refPath), source: "REFERENCE_FILE" };
  }

  return { buffer: buildFallbackDocxBuffer(fallbackTitle), source: "FALLBACK" };
}

/**
 * Builds a clean minimal valid .docx buffer with docxtemplater placeholders
 * so .docx generation & Print Pack zip work immediately even before reference .docx files are uploaded.
 */
export function buildFallbackDocxBuffer(title: string): Buffer {
  const zip = new PizZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Centre: {ecCode} — {instituteUpper}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Examination: {examName} | Date: {dateDDMMYYYY} | Session: {sessionTitle} | Day: {examDay}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Summary: {summaryLine}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Officer In-Charge: {oicFull} ({oicShort})</w:t></w:r></w:p>
  </w:body>
</w:document>`
  );
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
