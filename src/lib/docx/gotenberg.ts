/**
 * Converts a .docx buffer to PDF using a Gotenberg / LibreOffice worker
 * configured via GOTENBERG_URL (and optional GOTENBERG_SECRET bearer header).
 */
export async function convertDocxToPdf(docxBuffer: Buffer, filename = "report.docx"): Promise<Buffer> {
  const url = process.env.GOTENBERG_URL;
  if (!url) {
    throw new Error(
      "GOTENBERG_URL is not configured. Deploy /worker/Dockerfile to Railway/Render (Indian region) and set GOTENBERG_URL in Vercel env, or download the .docx directly."
    );
  }

  const form = new FormData();
  form.append(
    "files",
    new Blob([new Uint8Array(docxBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    filename
  );

  const headers: Record<string, string> = {};
  if (process.env.GOTENBERG_SECRET) {
    headers["Authorization"] = `Bearer ${process.env.GOTENBERG_SECRET}`;
  }

  const res = await fetch(`${url.replace(/\/$/, "")}/forms/libreoffice/convert`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Gotenberg conversion failed (${res.status}): ${await res.text()}`);
  }

  return Buffer.from(await res.arrayBuffer());
}
