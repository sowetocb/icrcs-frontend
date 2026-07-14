"use client";

import { useState, type ChangeEvent } from "react";
import { useWizard } from "./field";
import { useI18n } from "@/app/i18n/localeProvider";
import { loadRegistrationFor } from "@/app/registry/registrationStore";
import { Check } from "lucide-react";
import { loadProfile } from "@/lib/auth/profile";
import { uploadAttachment, ATTACHMENT_ACCEPT } from "@/lib/api/files";
import { getErrorMessage } from "@/lib/api/client";

// Parent / contact / spouse / relative identification documents use this type.
const DOC_ATTACHMENT_TYPE = 12;

/**
 * Optional identification-document upload for a person sub-form. Only shown once
 * a document type is selected (per the spec). Uploads to
 * /v1/files/upload (attachmentTypeId=12) and binds the returned URL to
 * `<prefix>DocFileUrl`, which the stage payload sends as `documentFileUrl`.
 */
export default function DocumentUpload({ prefix }: { prefix: string }) {
  const { data, set } = useWizard();
  const { t } = useI18n();
  const docType = (data[`${prefix}DocType`] as string) || "";
  const savedUrl = (data[`${prefix}DocFileUrl`] as string) || "";

  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    savedUrl ? "done" : "idle",
  );
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // The file input only appears once a document type is chosen.
  if (!docType) return null;

  async function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const subjectId = loadRegistrationFor(loadProfile()?.profileId ?? "")?.subjectId ?? "";
    if (!subjectId) {
      setError(t("fields.uploadsNeedId"));
      setStatus("error");
      return;
    }
    setName(file.name);
    setStatus("uploading");
    setError("");
    try {
      const up = await uploadAttachment(subjectId, DOC_ATTACHMENT_TYPE, file);
      set(`${prefix}DocFileUrl`, up.fileUrl);
      setStatus("done");
    } catch (err) {
      setError(getErrorMessage(err, t("fields.uploadFailed")));
      setStatus("error");
    }
  }

  return (
    <div>
      <span className="mb-1 block text-base font-medium text-navy-700">
        {t("fields.docFile")}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center overflow-hidden rounded-lg border border-line bg-surface text-base">
          <span className="shrink-0 border-r border-line px-3 py-2 font-medium text-navy-700">
            {status === "uploading" ? t("fields.uploading") : t("fields.chooseFile")}
          </span>
          <span className="max-w-[12rem] truncate px-3 py-2 text-muted">
            {name || t("fields.noFile")}
          </span>
          <input
            type="file"
            accept={ATTACHMENT_ACCEPT}
            disabled={status === "uploading"}
            className="sr-only"
            onChange={handle}
          />
        </label>

        {status === "done" && (
          <span className="inline-flex items-center gap-1 text-base font-semibold text-success">
            <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            {t("fields.uploaded")}
          </span>
        )}
      </div>
      {status === "error" && (
        <p role="alert" className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
