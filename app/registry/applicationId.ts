// Application ID helpers. The registration identifier is ALWAYS the backend's
// subjectId (e.g. ICRCS-20260719-ALN0002-…) — the frontend never fabricates one.

export function formatSubmittedDate(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}
