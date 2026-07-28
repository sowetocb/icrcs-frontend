/**
 * Client-side upload hardening (defense in depth). The backend MUST still
 * enforce size, MIME, magic-byte, and rename rules — these checks only stop
 * accidental/bad uploads and make trivial Burp bypasses harder from the UI path.
 *
 * Rejects: empty files, oversized files, disallowed MIME, null-byte / traversal
 * filenames, double extensions (e.g. shell.php.jpg), and magic-byte mismatches.
 */
import { RULES } from "./rules";

const EXT_BY_MIME: Record<string, readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/pdf": [".pdf"],
};

const ALLOWED_EXT = new Set(
  Object.values(EXT_BY_MIME).flatMap((xs) => xs.map((e) => e.toLowerCase())),
);

/** Dangerous trailing / embedded extensions often used in upload bypasses. */
const BLOCKED_EXT = new Set([
  ".php",
  ".phtml",
  ".php3",
  ".php4",
  ".php5",
  ".phar",
  ".asp",
  ".aspx",
  ".jsp",
  ".jspx",
  ".cgi",
  ".pl",
  ".py",
  ".rb",
  ".sh",
  ".bash",
  ".exe",
  ".dll",
  ".so",
  ".bat",
  ".cmd",
  ".ps1",
  ".js",
  ".mjs",
  ".html",
  ".htm",
  ".svg",
  ".xml",
  ".htaccess",
]);

export type UploadKind = "document" | "photo";

export type FileValidationOk = { ok: true; safeName: string; mime: string };
export type FileValidationErr = { ok: false; code: string; message: string };
export type FileValidationResult = FileValidationOk | FileValidationErr;

function basename(name: string): string {
  return name.replace(/^.*[\\/]/, "");
}

/** Strip null bytes / control chars and keep a single safe basename. */
export function sanitizeUploadFileName(name: string): string {
  const base = basename(name)
    .replace(/\0/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\w.\-()+ ]+/g, "_")
    .trim();
  return base.slice(0, 120) || "upload";
}

function extensionsOf(name: string): string[] {
  const base = basename(name).toLowerCase().replace(/\0/g, "");
  // Split on dots but keep leading-dot edge cases out.
  const parts = base.split(".").filter(Boolean);
  if (parts.length <= 1) return [];
  return parts.slice(1).map((p) => `.${p}`);
}

function hasBlockedExtension(name: string): boolean {
  return extensionsOf(name).some((ext) => BLOCKED_EXT.has(ext));
}

function hasAllowedFinalExtension(name: string, allowedMimes: readonly string[]): boolean {
  const exts = extensionsOf(name);
  if (exts.length === 0) return false;
  const finalExt = exts[exts.length - 1];
  if (!ALLOWED_EXT.has(finalExt)) return false;
  // Double-extension bypass: shell.php.jpg — any earlier blocked ext fails.
  if (hasBlockedExtension(name)) return false;
  // Final ext must match one of the allowed MIME families.
  return allowedMimes.some((mime) => (EXT_BY_MIME[mime] ?? []).includes(finalExt));
}

/** Read the first bytes and map to a known MIME, or null if unknown. */
export async function sniffFileMime(file: File): Promise<string | null> {
  const buf = await file.slice(0, 16).arrayBuffer();
  const b = new Uint8Array(buf);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "image/png";
  }
  // %PDF
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
    return "application/pdf";
  }
  return null;
}

/**
 * Validate a File before upload. Synchronous name/size/MIME checks run first;
 * call with `await` so magic-byte sniffing can complete.
 */
export async function validateUploadFile(
  file: File,
  kind: UploadKind = "document",
): Promise<FileValidationResult> {
  const allowedMimes =
    kind === "photo" ? RULES.PHOTO_ALLOWED_MIME : RULES.FILE_ALLOWED_MIME;
  const maxKb = Math.round(RULES.FILE_MAX_BYTES / 1024);
  const rawName = file.name || "upload";

  if (rawName.includes("\0") || /%00/i.test(rawName)) {
    return {
      ok: false,
      code: "FILE_NAME_INVALID",
      message: "File name is invalid.",
    };
  }
  if (/\.\.([\\/]|$)/.test(rawName) || rawName.includes("/") || rawName.includes("\\")) {
    return {
      ok: false,
      code: "FILE_NAME_INVALID",
      message: "File name is invalid.",
    };
  }
  if (file.size <= 0) {
    return { ok: false, code: "FILE_EMPTY", message: "File is empty or missing." };
  }
  if (file.size > RULES.FILE_MAX_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: `File must be ${maxKb} KB or smaller.`,
    };
  }
  if (!hasAllowedFinalExtension(rawName, allowedMimes)) {
    return {
      ok: false,
      code: "FILE_TYPE_NOT_ALLOWED",
      message:
        kind === "photo"
          ? "File type not allowed. Use JPG, JPEG or PNG."
          : "File type not allowed. Use PDF only.",
    };
  }

  const declared = (file.type || "").toLowerCase();
  if (declared && !(allowedMimes as readonly string[]).includes(declared)) {
    return {
      ok: false,
      code: "FILE_TYPE_NOT_ALLOWED",
      message:
        kind === "photo"
          ? "File type not allowed. Use JPG, JPEG or PNG."
          : "File type not allowed. Use PDF only.",
    };
  }

  const sniffed = await sniffFileMime(file);
  if (!sniffed || !(allowedMimes as readonly string[]).includes(sniffed)) {
    return {
      ok: false,
      code: "FILE_TYPE_NOT_ALLOWED",
      message:
        kind === "photo"
          ? "File content does not match an allowed image type (JPG, JPEG or PNG)."
          : "File content does not match PDF.",
    };
  }
  // Declared MIME (when present) must agree with magic bytes.
  if (declared && declared !== sniffed) {
    return {
      ok: false,
      code: "FILE_TYPE_NOT_ALLOWED",
      message: "File content does not match its declared type.",
    };
  }

  const safeName = sanitizeUploadFileName(rawName);
  // Re-check the sanitized name still has a safe final extension.
  if (!hasAllowedFinalExtension(safeName, allowedMimes) || hasBlockedExtension(safeName)) {
    const fallback =
      sniffed === "image/png" ? "upload.png" : sniffed === "application/pdf" ? "upload.pdf" : "upload.jpg";
    return { ok: true, safeName: fallback, mime: sniffed };
  }
  return { ok: true, safeName, mime: sniffed };
}

/** Build a File with a sanitized name (same bytes) for the multipart body. */
export function renameUploadFile(file: File, safeName: string, mime: string): File {
  try {
    return new File([file], safeName, { type: mime, lastModified: file.lastModified });
  } catch {
    return file;
  }
}
