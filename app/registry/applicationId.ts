// Application ID helpers. Format: CREG + yymmdd + 6 random digits.
// Generated once (after Personal Information) and reused through submission.

export function generateApplicationId(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return `CREG${yy}${mm}${dd}${rand}`;
}

export function formatSubmittedDate(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}
