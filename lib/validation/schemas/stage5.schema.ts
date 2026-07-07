/**
 * lib/validation/schemas/stage5.schema.ts
 * Registration Stage 5 - Documents & Attachments.
 *
 * NOTE: ATTACHMENT_TYPE ids are placeholders here; the app fetches real ids via
 * getAttachmentTypes(). For gap-closing at submit, prefer passing the app's live
 * type-ids in rather than trusting these constants.
 */
import { z } from 'zod';
import { RULES } from '../rules';

export const ATTACHMENT_TYPE = {
  PASSPORT_PHOTO: 1,
  BIRTH_CERTIFICATE: 2,
  AFFIDAVIT_BIRTH_CERTIFICATE: 3,
  NIDA: 4,
  DRIVING_LICENCE: 5,
  TIN: 6,
  VOTERS_ID: 7,
} as const;

const ADULT_ID_DOCUMENT_TYPES: number[] = [
  ATTACHMENT_TYPE.NIDA,
  ATTACHMENT_TYPE.DRIVING_LICENCE,
  ATTACHMENT_TYPE.TIN,
  ATTACHMENT_TYPE.VOTERS_ID,
];

// 1. Single file upload validation (before the file is sent to the file server).
export const uploadFileSchema = z
  .instanceof(File, { message: 'File is empty or missing' })
  .refine((f) => f.size > 0, 'File is empty or missing') // FILE_EMPTY
  .refine((f) => f.size <= RULES.FILE_MAX_BYTES, 'File exceeds maximum size of 500KB') // FILE_TOO_LARGE
  .refine(
    (f) => (RULES.FILE_ALLOWED_MIME as readonly string[]).includes(f.type),
    'File type not allowed. Use jpg, png or pdf',
  ); // FILE_TYPE_NOT_ALLOWED

// 2. Single attachment record (type + URL from the file server)
export const attachmentSchema = z.object({
  attachmentTypeId: z.number({ required_error: 'Attachment type ID is required' }),
  fileUrl: z
    .string({ required_error: 'Attachment file URL is required' })
    .url('Attachment file URL is required')
    .refine(
      (url) => url.includes('/icrcs-files/') || url.startsWith(process.env.NEXT_PUBLIC_FILE_SERVER_ORIGIN ?? ''),
      'Attachment URL must be from the ICRCS file server',
    ),
});
export type AttachmentInput = z.infer<typeof attachmentSchema>;

// 3. Full Stage 5 payload - array of attachments + cross-field rules
const stage5FormShape = z.object({
  attachments: z
    .array(attachmentSchema)
    .min(1, 'Attachments list is required')
    .max(RULES.ATTACHMENTS_MAX, `Too many attachments - maximum ${RULES.ATTACHMENTS_MAX} allowed`),
  applicantIsAdult: z.boolean(),
});
export type Stage5FormValues = z.infer<typeof stage5FormShape>;

export const stage5Schema = stage5FormShape.superRefine((data, ctx) => {
  const types = data.attachments.map((a) => a.attachmentTypeId);

  const seen = new Set<number>();
  data.attachments.forEach((a, idx) => {
    if (seen.has(a.attachmentTypeId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate attachment type - each type can only appear once', path: ['attachments', idx, 'attachmentTypeId'] });
    }
    seen.add(a.attachmentTypeId);
  });

  if (!types.includes(ATTACHMENT_TYPE.PASSPORT_PHOTO)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passport size photo is mandatory. Please upload it before completing Stage 5.', path: ['attachments'] });
  }

  const hasBirthProof =
    types.includes(ATTACHMENT_TYPE.BIRTH_CERTIFICATE) ||
    types.includes(ATTACHMENT_TYPE.AFFIDAVIT_BIRTH_CERTIFICATE);
  if (!hasBirthProof) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one of Birth Certificate or Affidavit Birth Certificate is required.', path: ['attachments'] });
  }

  if (data.applicantIsAdult) {
    const hasIdDoc = types.some((t) => ADULT_ID_DOCUMENT_TYPES.includes(t));
    if (!hasIdDoc) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one identification document is required for adults.', path: ['attachments'] });
    }
  }
});

export type Stage5Input = z.infer<typeof stage5Schema>;
