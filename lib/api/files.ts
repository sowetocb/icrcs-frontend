// Attachment uploads for registration Stage 5. Each document is uploaded
// individually to /v1/files/upload with its attachmentTypeId; Stage 5 is then
// finalised separately (see submitStage5).

import { apiUpload } from "./client";
import { loadSession } from "@/lib/auth/session";
import { RULES } from "@/lib/validation/rules";

const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type AttachmentType = {
  id: number;
  label: string;
  mandatory: boolean;
};

// attachmentTypeId values per GET /v1/lookup/attachment-types:
//   1 = Applicant Birth Certificate   4 = Letter from Local Government / Employer
//   2 = Father Birth Certificate      5 = Passport Size Photo
//   3 = Mother Birth Certificate      6 = Naturalisation Certificate
// Ids MUST match the backend's attachment-type lookup (see the table above):
// the passport photo is id 5 and is uploaded in the background (hidden from the
// list); the Naturalisation certificate is id 6.
export const ATTACHMENT_TYPES: AttachmentType[] = [
  { id: 1, label: "Applicant Birth Certificate", mandatory: true },
  { id: 2, label: "Father Birth Certificate", mandatory: false },
  { id: 3, label: "Mother Birth Certificate", mandatory: false },
  { id: 4, label: "Letter from Local Government / Employer", mandatory: true },
  { id: 5, label: "Passport Size Photo", mandatory: true },
  { id: 6, label: "Naturalisation / Confirmation / Renounciation Certificate", mandatory: false },
];

/** The backend's mandatory passport-size photo attachment type. Hidden from the
 * Stage 8 list — captured at Stage 1 and uploaded/merged automatically. */
export const PASSPORT_PHOTO_TYPE = 5;

/** Attachment types that MUST be uploaded before Stage 8 can be submitted. */
export const MANDATORY_ATTACHMENT_TYPE_IDS = ATTACHMENT_TYPES.filter((a) => a.mandatory).map(
  (a) => a.id,
);

/** Father / Mother birth certificates. Neither is mandatory ON ITS OWN — the
 * backend business rule is "at least ONE parent birth certificate (father or
 * mother)", so they can't be modelled with the per-type `mandatory` flag above.
 * Stage 8 enforces the either/or rule against this pair. */
export const PARENT_BIRTH_CERT_TYPE_IDS = [2, 3];

/** Accepted upload formats (jpg/png/pdf) — MIME types from the shared RULES,
 *  plus the matching file extensions for the native picker. */
export const ATTACHMENT_ACCEPT = `${RULES.FILE_ALLOWED_MIME.join(",")},.jpg,.jpeg,.png,.pdf`;

/** Metadata returned by an attachment upload — everything Stage 8 needs to
 * register the file against the application. */
export type UploadedAttachment = {
  fileId: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  fileHash: string;
};

/** POST /v1/files/upload — multipart upload of one typed attachment. Returns the
 * stored file metadata used to finalise Stage 8. */
export async function uploadAttachment(
  subjectId: string,
  attachmentTypeId: number,
  file: File,
): Promise<UploadedAttachment> {
  if (BYPASS) {
    await delay(500);
    return {
      fileId: `mock-file-${attachmentTypeId}`,
      fileUrl: `uploads/mock-${attachmentTypeId}-${file.name}`,
      mimeType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
      fileHash: `mockhash-${attachmentTypeId}`,
    };
  }
  const form = new FormData();
  form.append("file", file);
  form.append("subjectId", subjectId);
  form.append("attachmentTypeId", String(attachmentTypeId));

  const token = loadSession()?.accessToken;
  const raw = (await apiUpload("/v1/files/upload", form, token)) as Record<string, unknown>;
  const d = (raw?.data ?? raw ?? {}) as Record<string, unknown>;
  return {
    fileId: String(d.fileId ?? d.id ?? ""),
    // Prefer server-provided metadata; fall back to the local File for the
    // fields the browser already knows.
    fileUrl: String(d.fileUrl ?? d.url ?? d.path ?? ""),
    mimeType: String(d.mimeType ?? file.type ?? "application/octet-stream"),
    fileSizeBytes: Number(d.fileSizeBytes ?? d.size ?? file.size ?? 0),
    fileHash: String(d.fileHash ?? d.hash ?? ""),
  };
}

/** Convert a `data:` URL back into a File (for re-uploading a locally captured
 * file once the registration's subject id is known). */
function dataUrlToFile(dataUrl: string, fileName: string): File | null {
  const m = dataUrl.match(/^data:([^;,]*)(;base64)?,(.*)$/);
  if (!m) return null;
  const mime = m[1] || "application/octet-stream";
  const isBase64 = !!m[2];
  try {
    const raw = isBase64 ? atob(m[3]) : decodeURIComponent(m[3]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new File([bytes], fileName || "upload", { type: mime });
  } catch {
    return null;
  }
}

/** Upload a typed attachment held locally as a data URL (e.g. the Stage 1 birth
 * certificate, captured before the subject id exists). Returns null on failure. */
export async function uploadAttachmentDataUrl(
  subjectId: string,
  attachmentTypeId: number,
  dataUrl: string,
  fileName: string,
): Promise<UploadedAttachment | null> {
  if (!dataUrl || !subjectId) return null;
  if (BYPASS) {
    await delay(300);
    return {
      fileId: `mock-file-${attachmentTypeId}`,
      fileUrl: `uploads/mock-${attachmentTypeId}-${fileName}`,
      mimeType: "application/octet-stream",
      fileSizeBytes: 0,
      fileHash: `mockhash-${attachmentTypeId}`,
    };
  }
  const file = dataUrlToFile(dataUrl, fileName);
  if (!file) return null;
  return uploadAttachment(subjectId, attachmentTypeId, file);
}
