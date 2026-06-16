// Attachment uploads for registration Stage 5. Each document is uploaded
// individually to /v1/files/upload with its attachmentTypeId; Stage 5 is then
// finalised separately (see submitStage5).

import { apiUpload } from "./client";
import { loadSession } from "@/lib/auth/session";

const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type AttachmentType = {
  id: number;
  label: string;
  mandatory: boolean;
};

// attachmentTypeId values per the backend contract. The backend stores the
// The passport photo (attachmentTypeId=5) is mandatory at Stage 1 (Personal
// Information), so it is NOT mandatory again here in the Uploads stage.
export const ATTACHMENT_TYPES: AttachmentType[] = [
  { id: 5, label: "Passport Size Photo", mandatory: false },
  { id: 1, label: "Birth Certificate Copy", mandatory: false },
  { id: 2, label: "ID Copy (NIDA / Passport)", mandatory: false },
  { id: 4, label: "WEO / VEO Letter", mandatory: false },
  { id: 6, label: "Academic Certificate", mandatory: false },
  { id: 7, label: "Voters ID Copy", mandatory: false },
  { id: 8, label: "Passport Bio Page", mandatory: false },
];

/** The backend's mandatory passport-size photo attachment type. */
export const PASSPORT_PHOTO_TYPE = 5;

/** Accepted upload formats (jpg/png/pdf). */
export const ATTACHMENT_ACCEPT = "image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf";

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
