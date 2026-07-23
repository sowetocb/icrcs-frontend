// Frontend-only "Application ID" document generator.
//
// The Application ID is issued at Stage 1 — BEFORE the registration form exists
// on the backend — so there is no server PDF to fetch (the old
// /stage9/preview/pdf call 401'd / had nothing to return yet). This builds a
// small, official-looking receipt PDF entirely in the browser: no network call,
// no PDF library (the offline Docker build has no internet to pull one). It
// hand-writes a minimal, valid PDF 1.4 using the built-in Helvetica fonts (no
// font embedding required), then hands the blob to deliverPdf so the download
// works over plain HTTP too (see lib/api/registration.ts).

import { deliverPdf } from "@/lib/api/registration";

// PDF text strings must escape (, ) and \. Non-ASCII is transliterated away so
// each JS char maps to exactly one byte — keeping the xref byte offsets exact.
function pdfText(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "") // drop accents/marks and any non-Latin1 byte
    .replace(/([\\()])/g, "\\$1");
}

// Wrap a plain string to a rough character width (Helvetica ~ proportional, so
// this is approximate but safe for a narrow column).
function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && line.length + 1 + w.length > max) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Build the page content stream (PDF drawing operators). A4 = 595 x 842 pt. */
function buildContent(opts: {
  country: string;
  department: string;
  idLabel: string;
  applicationId: string;
  nameLabel: string;
  name: string;
  dateLabel: string;
  date: string;
  help: string;
}): string {
  const ops: string[] = [];

  // ── Masthead ────────────────────────────────────────────────────────────
  ops.push("BT", "/F2 17 Tf", "0.04 0.12 0.29 rg", "60 770 Td", `(${pdfText(opts.country)}) Tj`);
  ops.push("/F1 12 Tf", "0.30 0.33 0.40 rg", "0 -20 Td", `(${pdfText(opts.department)}) Tj`, "ET");

  // Gold rule under the masthead.
  ops.push("0.83 0.68 0.22 rg", "60 738 475 3 re", "f");

  // ── Application ID card (navy filled box) ───────────────────────────────
  ops.push("0.04 0.12 0.29 rg", "60 590 475 120 re", "f");
  ops.push("BT", "/F1 10 Tf", "0.66 0.72 0.85 rg", "80 676 Td", `(${pdfText(opts.idLabel.toUpperCase())}) Tj`, "ET");
  ops.push("BT", "/F2 26 Tf", "0.90 0.74 0.28 rg", "80 630 Td", `(${pdfText(opts.applicationId)}) Tj`, "ET");

  // ── Detail rows ─────────────────────────────────────────────────────────
  let y = 545;
  const row = (label: string, value: string) => {
    ops.push("BT", "/F1 10 Tf", "0.45 0.48 0.55 rg", `60 ${y} Td`, `(${pdfText(label.toUpperCase())}) Tj`, "ET");
    ops.push("BT", "/F2 13 Tf", "0.10 0.13 0.20 rg", `60 ${y - 16} Td`, `(${pdfText(value || "-")}) Tj`, "ET");
    y -= 46;
  };
  row(opts.nameLabel, opts.name);
  row(opts.dateLabel, opts.date);

  // ── Help text (wrapped) ─────────────────────────────────────────────────
  y -= 6;
  ops.push("0.87 0.89 0.92 rg", `60 ${y - 4} 475 1 re`, "f");
  y -= 26;
  ops.push("BT", "/F1 11 Tf", "0.30 0.33 0.40 rg", `60 ${y} Td`, "13 TL");
  const helpLines = wrap(opts.help, 78);
  helpLines.forEach((ln, i) => {
    ops.push(i === 0 ? `(${pdfText(ln)}) Tj` : `(${pdfText(ln)}) '`);
  });
  ops.push("ET");

  return ops.join("\n");
}

/** Assemble a complete, valid single-page PDF document from a content stream. */
function assemblePdf(content: string): Blob {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  const count = objects.length + 1;
  pdf += `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  // Latin1 so each char is one byte, matching the offsets computed above.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: "application/pdf" });
}

export type ApplicationIdDoc = {
  applicationId: string;
  applicantName?: string;
  /** Localized labels/strings (pass i18n values so the doc matches the UI). */
  labels: {
    country: string;
    department: string;
    idLabel: string;
    nameLabel: string;
    dateLabel: string;
    help: string;
  };
  fileName?: string;
};

/** Generate and download the Application ID receipt PDF entirely on the client.
 * Never touches the backend. Returns true (kept async/boolean to match the
 * dialog's onDownload contract). */
export async function downloadApplicationIdPdf(doc: ApplicationIdDoc): Promise<boolean> {
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const content = buildContent({
    country: doc.labels.country,
    department: doc.labels.department,
    idLabel: doc.labels.idLabel,
    applicationId: doc.applicationId,
    nameLabel: doc.labels.nameLabel,
    name: doc.applicantName ?? "",
    dateLabel: doc.labels.dateLabel,
    date,
    help: doc.labels.help,
  });
  const blob = assemblePdf(content);
  const safeId = doc.applicationId.replace(/[^A-Za-z0-9-]/g, "");
  await deliverPdf(blob, doc.fileName ?? `Application-ID-${safeId}`);
  return true;
}
