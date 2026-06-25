/** Consistent download/print filename for a person's form across every entry
 * point (success screen, registered-people list). Collapses whitespace so the
 * name format is identical everywhere. */
export function registrationFormFileName(name: string): string {
  const clean = (name || "").replace(/\s+/g, " ").trim();
  return `${clean || "Citizen"} Registration Form`;
}

/** Open the browser's native Print dialog so the user can print or save‐as‑PDF
 * the filled registration form. The `@media print` rules in `globals.css`
 * already hide everything except `#printable-form` and the print‐specific
 * layout is provided by `/registry-print.css` (linked in the page head).
 *
 * To give the saved PDF a consistent filename across all browsers, we
 * temporarily set `document.title` to the desired name (browsers use the page
 * title as the default "Save as PDF" filename). */
export async function printRegistrationForm(
  root: HTMLElement | null,
  documentName = "Registration Form",
): Promise<void> {
  if (!root) return;

  // Give React one tick to flush any pending state into the hidden
  // #printable-form before we trigger the print dialog.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // Set the page title to the desired filename so the browser's "Save as PDF"
  // defaults to it. Restored after the dialog closes (or is cancelled).
  const originalTitle = document.title;
  document.title = documentName;

  window.print();

  // Restore the original page title after the print dialog closes.
  document.title = originalTitle;
}
