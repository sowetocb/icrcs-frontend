import { loadRegistration } from "../registrationStore";

export type LookupResult =
  | { kind: "invalid" }
  | { kind: "incomplete"; id: string; step: number } // step 1..6 = next form to complete
  | { kind: "processing"; id: string; stage: number }; // stage 0..4

// Resolves an application's stage. Prefers the locally stored registration
// (real progress kept in localStorage); falls back to a deterministic mock so
// arbitrary IDs still demonstrate the feature. Replace with the backend later.
export function lookupApplication(raw: string): LookupResult {
  const id = raw.trim().toUpperCase();
  const stored = loadRegistration();

  if (stored) {
    // Match the typed ID against the stored one (empty input also matches the
    // device's own registration). Drafts get an ID after Personal Information.
    const storedId = stored.applicationId?.toUpperCase() ?? "";
    const matchesId = !id || storedId === id || !storedId;
    if (matchesId) {
      if (!stored.completed) {
        return { kind: "incomplete", id: stored.applicationId ?? id, step: stored.step };
      }
      return {
        kind: "processing",
        id: stored.applicationId ?? id,
        stage: stored.stage ?? 0,
      };
    }
  }

  // No matching local record — simulate from the ID so the lookup still works.
  if (id.replace(/[^A-Z0-9]/g, "").length < 6) return { kind: "invalid" };
  const digits = id.replace(/\D/g, "");
  const basis = digits.length ? digits : id;
  let h = 0;
  for (const ch of basis) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  if (h % 7 < 3) {
    return { kind: "incomplete", id, step: (Math.floor(h / 7) % 6) + 1 };
  }
  return { kind: "processing", id, stage: h % 5 };
}
