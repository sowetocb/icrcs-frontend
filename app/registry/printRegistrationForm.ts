/** Consistent download/print filename for a person's form across every entry
 * point (success screen, registered-people list). Collapses whitespace so the
 * name format is identical everywhere. */
export function registrationFormFileName(name: string): string {
  const clean = (name || "").replace(/\s+/g, " ").trim();
  return `${clean || "Citizen"} Registration Form`;
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
