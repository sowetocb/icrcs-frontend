/** Consistent download/print filename for a person's form across every entry
 * point (success screen, registered-people list). Collapses whitespace so the
 * name format is identical everywhere. */
export function registrationFormFileName(name: string): string {
  const clean = (name || "").replace(/\s+/g, " ").trim();
  return `${clean || "Citizen"} Registration Form`;
}

/** Directly download the filled form as a PDF (no print dialog). The on-page
 * form is `display:none` and only styled by the print stylesheet, so we clone it
 * into a visible, off-screen container with that stylesheet applied, then let
 * html2pdf rasterize + save it. `fileName` is without the ".pdf" extension. */
export async function downloadRegistrationForm(
  root: HTMLElement | null,
  fileName = "Registration Form",
): Promise<void> {
  if (!root || typeof window === "undefined") return;
  const html2pdf = (await import("html2pdf.js")).default;

  const holder = document.createElement("div");
  // 794px ≈ A4 width at 96dpi. Off-screen but rendered so html2canvas can read it.
  holder.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;";

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/registry-print.css";
  holder.appendChild(link);

  const clone = root.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id"); // avoid the global `#printable-form{display:none}`
  clone.style.display = "block";
  // Absolutise any root-relative image src so html2canvas can load them.
  clone.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (src?.startsWith("/")) img.setAttribute("src", `${window.location.origin}${src}`);
  });
  holder.appendChild(clone);
  document.body.appendChild(holder);

  // Give the stylesheet, fonts and images a moment to load before capturing.
  await new Promise((r) => setTimeout(r, 500));

  // Stored in a variable so the extra `pagebreak` option (valid at runtime, but
  // absent from the package's types) isn't rejected by excess-property checks.
  const opts = {
    margin: 0,
    filename: `${fileName}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
    pagebreak: { mode: ["css", "legacy"] },
  };

  try {
    await html2pdf().set(opts).from(clone).save();
  } finally {
    holder.remove();
  }
}

/** Print the filled registration form. `documentName` becomes the print
 * document title, which browsers use as the default "Save as PDF" filename
 * (e.g. "John Mahwaya Registration Form.pdf"). */
export function printRegistrationForm(
  root: HTMLElement | null,
  documentName = "Registration Form",
): void {
  if (!root) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;width:0;height:0;border:0;visibility:hidden;",
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  const origin = window.location.origin;
  const title = documentName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const markup = root.cloneNode(true) as HTMLElement;

  markup.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (src?.startsWith("/")) img.setAttribute("src", `${origin}${src}`);
  });

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="stylesheet" href="${origin}/registry-print.css">
</head>
<body>${markup.outerHTML}</body>
</html>`);
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };

  const runPrint = () => {
    win.focus();
    win.print();
    win.onafterprint = cleanup;
    window.setTimeout(cleanup, 2000);
  };

  if (doc.readyState === "complete") {
    window.setTimeout(runPrint, 300);
  } else {
    win.addEventListener("load", () => window.setTimeout(runPrint, 300), { once: true });
  }
}
