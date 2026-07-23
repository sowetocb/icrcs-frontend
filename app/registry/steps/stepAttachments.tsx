"use client";

import { useState, type ChangeEvent } from "react";
import { useWizard } from "@/components/registry/field";
import { useI18n } from "@/app/i18n/localeProvider";
import { loadRegistrationFor } from "@/app/registry/registrationStore";
import { loadProfile } from "@/lib/auth/profile";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  ATTACHMENT_TYPES,
  ATTACHMENT_ACCEPT,
  PASSPORT_PHOTO_TYPE,
  OTHER_SUPPORTING_DOC_TYPE,
  MAX_OTHER_SUPPORTING_DOCS,
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
  /** Slot index for "other supporting documents" (1–10). Absent for the
   * standard attachment types which are keyed solely by typeId. */
  otherSlot?: number;
  /** User-entered label / description for "other supporting documents". */
  docLabel?: string;
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

// ── "Other Supporting Documents" slot key ───────────────────────────────────
// Each extra document is identified by a composite key so it doesn't collide
// with the standard attachment types (which are keyed by typeId alone).
const otherKey = (slot: number) => `other-${slot}`;

export default function StepAttachments() {
  const { t } = useI18n();
  const { data, set, errors, fieldErrors, isMigrant, isOfficerMode, subjectId: ctxSubjectId } = useWizard();
  // Uploads are COMPLETELY optional on the migrant track (Migrant / Refugee /
  // Asylum Seeker / Alien / Undocumented Migrant / Voluntary Returnee) — these
  // applicants often hold no civil documents at all — AND for every officer
  // registration (officers only ever register migrants, so the same rule applies
  // even if the migrant category isn't resolvable at this point). So no type is
  // treated as mandatory: nothing is pre-ticked, no checkbox is force-locked, and
  // the "Required" badge is hidden. (The wizard's Stage 8 gate is skipped too.)
  const uploadsOptional = isMigrant || isOfficerMode;
  const isRequiredType = (mandatory: boolean) => mandatory && !uploadsOptional;
  // The backend registration id the file belongs to. Prefer the wizard's live
  // value (the ONLY source officers have — they have no citizen profile to look
  // it up from); fall back to the citizen draft lookup. Officers MUST send this
  // in the upload FormData or /v1/officer/files/upload rejects with "No
  // registration found for this profile".
  const subjectId =
    ctxSubjectId || loadRegistrationFor(loadProfile()?.profileId ?? "")?.subjectId || "";

  const saved = parseAttachments(data.attachments);
  // Reactive view of what's already uploaded (this session OR re-hydrated from
  // GET /stage8) so previously-uploaded files always show as done, even when
  // they arrive after this component first mounted.
  const savedByType = new Map(saved.filter((a) => !a.otherSlot).map((a) => [a.typeId, a]));
  // Pre-tick the mandatory type and any already-uploaded ones.
  const [ticked, setTicked] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const a of ATTACHMENT_TYPES) if (isRequiredType(a.mandatory)) init[a.id] = true;
    for (const a of saved) if (!a.otherSlot) init[a.typeId] = true;
    return init;
  });
  const [rows, setRows] = useState<Record<number, RowState>>(() => {
    const init: Record<number, RowState> = {};
    for (const a of saved) if (!a.otherSlot) init[a.typeId] = { status: "done", name: a.name };
    return init;
  });

  // ── "Other Supporting Documents" state ──────────────────────────────────────
  // Recover existing extra docs from the attachment list so they survive resume.
  const savedOtherDocs = saved.filter((a) => a.otherSlot);
  const [otherSlots, setOtherSlots] = useState<number[]>(() => {
    if (savedOtherDocs.length > 0) return savedOtherDocs.map((a) => a.otherSlot!);
    return [];
  });
  const [otherRows, setOtherRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    for (const a of savedOtherDocs) {
      init[otherKey(a.otherSlot!)] = { status: "done", name: a.name };
    }
    return init;
  });
  // Counter to generate unique slot ids (starts past any recovered slots).
  const [nextSlot, setNextSlot] = useState(() =>
    savedOtherDocs.length > 0
      ? Math.max(...savedOtherDocs.map((a) => a.otherSlot!)) + 1
      : 1,
  );
  // User-entered document name / description for each "other" slot.
  const [otherNames, setOtherNames] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const a of savedOtherDocs) {
      init[otherKey(a.otherSlot!)] = a.docLabel ?? "";
    }
    return init;
  });

  // ── Standard attachment helpers ─────────────────────────────────────────────

  function persist(typeId: number, name: string, up: UploadedAttachment) {
    const list = parseAttachments(data.attachments).filter((a) => !(a.typeId === typeId && !a.otherSlot));
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

  /** Remove a document's uploaded file + row when the user deselects it, so it is
   * no longer part of the submission. */
  function removeAttachment(typeId: number) {
    const list = parseAttachments(data.attachments).filter((a) => !(a.typeId === typeId && !a.otherSlot));
    set("attachments", JSON.stringify(list));
    setRows((r) => {
      const next = { ...r };
      delete next[typeId];
      return next;
    });
    if (typeId === PASSPORT_PHOTO_TYPE) set("passportPhotoUploaded", "");
    if (typeId === 2) set("idDocumentUploaded", "");
  }

  /** A checkbox is only disabled while its file is mid-upload — the user may
   * freely deselect any document here because this stage (Uploads) is BEFORE the
   * declaration & submission. Deselecting removes the uploaded file (see toggle);
   * mandatory documents are still enforced when the stage is saved. */
  function isCheckboxLocked(typeId: number): boolean {
    return rows[typeId]?.status === "uploading";
  }

  function toggle(typeId: number) {
    setTicked((prev) => {
      const nextTicked = !prev[typeId];
      // Deselecting before declaration drops the uploaded file so it isn't
      // submitted; the user can re-tick and upload again.
      if (!nextTicked) removeAttachment(typeId);
      return { ...prev, [typeId]: nextTicked };
    });
  }

  // ── "Other Supporting Documents" helpers ────────────────────────────────────

  function addOtherSlot() {
    if (otherSlots.length >= MAX_OTHER_SUPPORTING_DOCS) return;
    setOtherSlots((s) => [...s, nextSlot]);
    setNextSlot((n) => n + 1);
  }

  function removeOtherSlot(slot: number) {
    setOtherSlots((s) => s.filter((x) => x !== slot));
    setOtherRows((r) => {
      const next = { ...r };
      delete next[otherKey(slot)];
      return next;
    });
    setOtherNames((n) => {
      const next = { ...n };
      delete next[otherKey(slot)];
      return next;
    });
    // Remove from persisted attachments
    const list = parseAttachments(data.attachments).filter((a) => a.otherSlot !== slot);
    set("attachments", JSON.stringify(list));
  }

  function persistOther(slot: number, name: string, up: UploadedAttachment) {
    const list = parseAttachments(data.attachments).filter((a) => a.otherSlot !== slot);
    list.push({
      id: `att-other-${slot}`,
      typeId: OTHER_SUPPORTING_DOC_TYPE,
      name,
      fileId: up.fileId,
      fileUrl: up.fileUrl,
      mimeType: up.mimeType,
      fileSizeBytes: up.fileSizeBytes,
      fileHash: up.fileHash,
      otherSlot: slot,
      docLabel: otherNames[otherKey(slot)] || "",
    });
    set("attachments", JSON.stringify(list));
  }

  /** Update the user-entered document name for an "other" slot and persist it
   * into the attachment list so it survives resume. */
  function updateOtherName(slot: number, label: string) {
    const key = otherKey(slot);
    setOtherNames((n) => ({ ...n, [key]: label }));
    // Re-persist the attachment with the updated label if it was already uploaded.
    const list = parseAttachments(data.attachments);
    const idx = list.findIndex((a) => a.otherSlot === slot);
    if (idx >= 0) {
      list[idx] = { ...list[idx], docLabel: label };
      set("attachments", JSON.stringify(list));
    }
  }

  async function handleOtherFile(slot: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = otherKey(slot);
    if (file.size === 0) {
      setOtherRows((r) => ({
        ...r,
        [key]: { status: "error", name: file.name, error: t("registry.attachFileEmpty") },
      }));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setOtherRows((r) => ({
        ...r,
        [key]: { status: "error", name: file.name, error: t("registry.attachTooLarge") },
      }));
      e.target.value = "";
      return;
    }
    setOtherRows((r) => ({ ...r, [key]: { status: "uploading", name: file.name } }));
    try {
      const uploaded = await uploadAttachment(subjectId, OTHER_SUPPORTING_DOC_TYPE, file);
      setOtherRows((r) => ({ ...r, [key]: { status: "done", name: file.name } }));
      persistOther(slot, file.name, uploaded);
    } catch (err) {
      setOtherRows((r) => ({
        ...r,
        [key]: { status: "error", name: file.name, error: getErrorMessage(err, t("fields.uploadFailed")) },
      }));
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t("registry.attachHint")}</p>

      {/* ── Standard document types ──────────────────────────────────────── */}
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
                    disabled={isCheckboxLocked(type.id)}
                    onChange={() => toggle(type.id)}
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

      {/* ── Other Supporting Documents ────────────────────────────────────── */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy-700">
            {t("registry.otherDocsTitle")}
          </h3>
          <span className="text-xs text-muted">
            {t("registry.otherDocsCount")
              .replace("{n}", String(otherSlots.length))
              .replace("{max}", String(MAX_OTHER_SUPPORTING_DOCS))}
          </span>
        </div>
        <p className="text-sm text-muted">{t("registry.otherDocsHint")}</p>

        <ul className="space-y-3">
          {otherSlots.map((slot, idx) => {
            const key = otherKey(slot);
            const row: RowState = otherRows[key] ?? { status: "idle" };
            const docName = otherNames[key] ?? "";
            return (
              <li key={key} className="rounded-xl border border-line bg-card p-4 space-y-3">
                {/* Row 1: Document name input */}
                <div className="flex items-center gap-3">
                  <span className="shrink-0 text-sm font-medium text-ink">
                    {t("registry.otherDocLabel").replace("{n}", String(idx + 1))}
                  </span>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => updateOtherName(slot, e.target.value)}
                    placeholder={t("registry.otherDocNamePlaceholder")}
                    maxLength={100}
                    className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                  />
                </div>

                {/* Row 2: File upload + status + remove */}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex flex-1 cursor-pointer items-center overflow-hidden rounded-lg border border-line bg-surface text-sm">
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
                      onChange={(e) => handleOtherFile(slot, e)}
                    />
                  </label>

                  {row.status === "done" && (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                      <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                      {t("fields.uploaded")}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => removeOtherSlot(slot)}
                    disabled={row.status === "uploading"}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                    aria-label={t("registry.attachRemove")}
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                    {t("registry.attachRemove")}
                  </button>
                </div>

                {row.status === "error" && (
                  <p role="alert" className="mt-2 text-sm font-medium text-danger">
                    {row.error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {otherSlots.length < MAX_OTHER_SUPPORTING_DOCS && (
          <button
            type="button"
            onClick={addOtherSlot}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-navy-300 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:border-navy-500 hover:bg-navy-50"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            {t("registry.otherDocsAdd")}
          </button>
        )}
      </div>

    </div>
  );
}
