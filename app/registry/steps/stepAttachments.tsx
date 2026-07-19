"use client";

import { useState, type ChangeEvent } from "react";
import { useWizard } from "@/components/registry/field";
import { useI18n } from "@/app/i18n/localeProvider";
import { loadRegistrationFor } from "@/app/registry/registrationStore";
import { loadProfile } from "@/lib/auth/profile";
import { Check } from "lucide-react";
import {
  ATTACHMENT_TYPES,
  ATTACHMENT_ACCEPT,
  PASSPORT_PHOTO_TYPE,
  uploadAttachment,
  type UploadedAttachment,
} from "@/lib/api/files";
import { getErrorMessage } from "@/lib/api/client";

export type Attachment = {
  id: string;
  typeId: number;
  name: string;
  fileId?: string;
  // Stored so Stage 8 can register the file against the application.
  fileUrl?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  fileHash?: string;
};

export function parseAttachments(raw: unknown): Attachment[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as Attachment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type Status = "idle" | "uploading" | "done" | "error";
type RowState = { status: Status; name?: string; error?: string };

// Maximum accepted size for an uploaded supporting document.
const MAX_ATTACHMENT_BYTES = 300 * 1024; // 300KB

/** Read a file as a base64 data URL (used to keep the passport photo locally). */
function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

export default function StepAttachments() {
  const { t } = useI18n();
  const { data, set, errors, fieldErrors, isMigrant } = useWizard();
  // On the migrant track (Migrant / Refugee / Asylum Seeker / Alien /
  // Undocumented Migrant / Voluntary Returnee) uploads are COMPLETELY optional —
  // these applicants often hold no civil documents at all. So no type is treated
  // as mandatory: nothing is pre-ticked, no checkbox is force-locked, and the
  // "Required" badge is hidden. (The wizard's Stage 8 gate is skipped too.)
  const isRequiredType = (mandatory: boolean) => mandatory && !isMigrant;
  const subjectId = loadRegistrationFor(loadProfile()?.profileId ?? "")?.subjectId ?? "";

  const saved = parseAttachments(data.attachments);
  // Reactive view of what's already uploaded (this session OR re-hydrated from
  // GET /stage8) so previously-uploaded files always show as done, even when
  // they arrive after this component first mounted.
  const savedByType = new Map(saved.map((a) => [a.typeId, a]));
  // Track which document types already have an upload from a prior stage (1-6)
  // or from the current session. These are "locked" — the user can replace the
  // file but cannot un-tick the checkbox (the document is already committed).
  const [lockedTypes] = useState<Set<number>>(() => {
    const s = new Set<number>();
    for (const a of saved) s.add(a.typeId);
    return s;
  });
  // Pre-tick the mandatory type and any already-uploaded ones.
  const [ticked, setTicked] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const a of ATTACHMENT_TYPES) if (isRequiredType(a.mandatory)) init[a.id] = true;
    for (const a of saved) init[a.typeId] = true;
    return init;
  });
  const [rows, setRows] = useState<Record<number, RowState>>(() => {
    const init: Record<number, RowState> = {};
    for (const a of saved) init[a.typeId] = { status: "done", name: a.name };
    return init;
  });

  function persist(typeId: number, name: string, up: UploadedAttachment) {
    const list = parseAttachments(data.attachments).filter((a) => a.typeId !== typeId);
    list.push({
      id: `att-${typeId}`,
      typeId,
      name,
      fileId: up.fileId,
      fileUrl: up.fileUrl,
      mimeType: up.mimeType,
      fileSizeBytes: up.fileSizeBytes,
      fileHash: up.fileHash,
    });
    set("attachments", JSON.stringify(list));
    if (typeId === PASSPORT_PHOTO_TYPE) set("passportPhotoUploaded", "true");
    if (typeId === 2) set("idDocumentUploaded", "true");
  }

  async function handleFile(typeId: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reject a 0-byte file up front — the backend rejects empty uploads
    // (FILE_EMPTY), and uploading one just wastes a round-trip.
    if (file.size === 0) {
      setRows((r) => ({
        ...r,
        [typeId]: { status: "error", name: file.name, error: t("registry.attachFileEmpty") },
      }));
      e.target.value = "";
      return;
    }
    // Cap uploads at 300KB — reject larger files before any upload attempt.
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setRows((r) => ({
        ...r,
        [typeId]: { status: "error", name: file.name, error: t("registry.attachTooLarge") },
      }));
      e.target.value = "";
      return;
    }
    // Keep a local copy of the passport photo as a data URL so it can be shown
    // on the printable form — the backend doesn't serve uploaded images.
    if (typeId === PASSPORT_PHOTO_TYPE) {
      if (file.type.startsWith("image/")) {
        readDataUrl(file).then((url) => set("passportPhotoData", url));
      } else {
        set("passportPhotoData", "");
      }
    }
    setRows((r) => ({ ...r, [typeId]: { status: "uploading", name: file.name } }));
    try {
      const uploaded = await uploadAttachment(subjectId, typeId, file);
      setRows((r) => ({ ...r, [typeId]: { status: "done", name: file.name } }));
      persist(typeId, file.name, uploaded);
    } catch (err) {
      setRows((r) => ({
        ...r,
        [typeId]: { status: "error", name: file.name, error: getErrorMessage(err, t("fields.uploadFailed")) },
      }));
    }
    e.target.value = "";
  }

  /** A checkbox is disabled (non-uncheckable) when the document type is
   * mandatory OR was already uploaded in a prior stage (1-6). The user can
   * still replace the file via the upload button, but cannot remove it. */
  function isCheckboxLocked(typeId: number, mandatory: boolean): boolean {
    return isRequiredType(mandatory) || lockedTypes.has(typeId) || savedByType.has(typeId);
  }

  function toggle(typeId: number, mandatory: boolean) {
    if (isCheckboxLocked(typeId, mandatory)) return;
    setTicked((prev) => ({ ...prev, [typeId]: !prev[typeId] }));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t("registry.attachHint")}</p>

      <ul className="space-y-3">
        {/* The passport photo is supplied at Stage 1 and merged into the
            upload payload automatically — it's never shown as its own row. */}
        {ATTACHMENT_TYPES.filter((type) => type.id !== PASSPORT_PHOTO_TYPE).map((type) => {
          const savedAtt = savedByType.get(type.id);
          // The passport photo captured at Stage 1 satisfies this row — but only
          // when its image data is still available to re-attach on submit
          // (otherwise the backend would reject "Passport Size Photo required").
          const photoFromStage1 =
            type.id === PASSPORT_PHOTO_TYPE &&
            !savedAtt &&
            typeof data.stage1PhotoData === "string" &&
            data.stage1PhotoData.length > 0;
          const isTicked = !!ticked[type.id] || !!savedAtt || photoFromStage1;
          const row =
            rows[type.id] ??
            (savedAtt
              ? { status: "done" as Status, name: savedAtt.name }
              : photoFromStage1
                ? { status: "done" as Status, name: t("registry.photoFromStage1") }
                : { status: "idle" as Status });
          return (
            <li key={type.id} className="rounded-xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isTicked}
                    disabled={isCheckboxLocked(type.id, type.mandatory)}
                    onChange={() => toggle(type.id, type.mandatory)}
                    className="h-4 w-4 shrink-0 rounded border-line accent-navy-700 disabled:opacity-60"
                  />
                  <span className="text-sm font-medium text-ink">
                    {/* Prefer the translated name; fall back to the type's own
                        label when no i18n key matches the id (avoids showing a
                        raw "attach.aN" or a stale label after a renumber). */}
                    {(() => {
                      const key = `attach.a${type.id}`;
                      const translated = t(key);
                      return translated === key ? type.label : translated;
                    })()}
                    {isRequiredType(type.mandatory) && (
                      <span className="ml-2 rounded bg-danger/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-danger">
                        {t("fields.required")}
                      </span>
                    )}
                  </span>
                </label>

                {isTicked && (
                  <label className="inline-flex cursor-pointer items-center overflow-hidden rounded-lg border border-line bg-surface text-sm">
                    <span className="shrink-0 border-r border-line px-3 py-2 font-medium text-navy-700">
                      {row.status === "uploading" ? t("fields.uploading") : t("registry.attachChoose")}
                    </span>
                    <span className="max-w-[12rem] truncate px-3 py-2 text-muted">
                      {row.name || t("registry.attachEmpty")}
                    </span>
                    <input
                      type="file"
                      accept={ATTACHMENT_ACCEPT}
                      disabled={row.status === "uploading"}
                      className="sr-only"
                      onChange={(e) => handleFile(type.id, e)}
                    />
                  </label>
                )}

                {row.status === "done" && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                    <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                    {t("fields.uploaded")}
                  </span>
                )}
              </div>

              {row.status === "error" && (
                <p role="alert" className="mt-2 text-sm font-medium text-danger">
                  {row.error}
                </p>
              )}
              {errors.includes(`attach${type.id}`) && row.status !== "done" && (
                <p role="alert" data-field-error={`attach${type.id}`} className="mt-2 text-sm font-medium text-danger">
                  {fieldErrors?.[`attach${type.id}`] || t("registry.attachRequiredField")}
                </p>
              )}
            </li>
          );
        })}
      </ul>

    </div>
  );
}
