/**
 * lib/validation/schemas/stage4.schema.ts
 * Registration Stage 4 - Education & Employment.
 *
 * NOTE: EDUCATION_LEVEL / EMPLOYMENT ids are placeholders; the app fetches real
 * ids via getEducationLevels() / getEmploymentStatuses(). For gap-closing, pass
 * the live "primary" education id and the current-year bound in.
 */
import { z } from 'zod';
import { RULES } from '../rules';

export const EDUCATION_LEVEL = {
  PRIMARY: 1,
  SECONDARY: 2,
  ADVANCED: 3,
  CERTIFICATE: 4,
  DIPLOMA: 5,
  BACHELOR: 6,
  MASTERS: 7,
  DOCTORATE: 8,
} as const;

export const EMPLOYMENT_STATUS = {
  EMPLOYED: 'EMPLOYED',
  UNEMPLOYED: 'UNEMPLOYED',
  SELF_EMPLOYED: 'SELF_EMPLOYED',
  STUDENT: 'STUDENT',
  RETIRED: 'RETIRED',
} as const;

const educationEntrySchema = z.object({
  educationLevelId: z.number({ required_error: 'Education level is required' }),
  countryCode: z.string({ required_error: 'Education country code is required' }).regex(/^[A-Z]{3}$/, 'Education country must be a valid 3-letter ISO-3166-1 alpha-3 code'),
  city: z.string({ required_error: 'Education city is required' }).trim().min(1, 'Education city is required'),
  school: z.string({ required_error: 'Education school name is required' }).trim().min(1, 'Education school name is required'),
  registrationNumber: z.string({ required_error: 'Education registration number is required' }).trim().min(1, 'Education registration number is required'),
  completionYear: z
    .number({ required_error: 'Education completion year is required' })
    .int()
    .min(RULES.EDU_YEAR_MIN, `Completion year must be between ${RULES.EDU_YEAR_MIN} and current year`)
    .max(new Date().getFullYear(), `Completion year must be between ${RULES.EDU_YEAR_MIN} and current year`),
});
export type EducationEntry = z.infer<typeof educationEntrySchema>;

const employmentShape = {
  employmentStatus: z.nativeEnum(EMPLOYMENT_STATUS, {
    required_error: 'Employment status is required',
    invalid_type_error: 'Invalid employment status',
  }),
  occupationTypeId: z.number({ required_error: 'Occupation type is required' }),
  organization: z.string().trim().optional(),
};

const stage4FormShape = z.object({
  educations: z.array(educationEntrySchema).min(1, 'At least one education entry is required'),
  ...employmentShape,
});
export type Stage4FormValues = z.infer<typeof stage4FormShape>;

/** Factory: build Stage 4 schema given the applicant's DOB and the "primary"
 *  education level id (defaults to the placeholder EDUCATION_LEVEL.PRIMARY). */
export function buildStage4Schema(applicantDob?: string, primaryLevelId: number = EDUCATION_LEVEL.PRIMARY) {
  return stage4FormShape.superRefine((data, ctx) => {
    const hasPrimary = data.educations.some((e) => e.educationLevelId === primaryLevelId);
    if (!hasPrimary) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Primary education is required', path: ['educations'] });
    }

    const seen = new Set<number>();
    data.educations.forEach((entry, idx) => {
      if (seen.has(entry.educationLevelId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate education level - each level can only appear once', path: ['educations', idx, 'educationLevelId'] });
      }
      seen.add(entry.educationLevelId);

      if (applicantDob) {
        const birthYear = new Date(applicantDob).getFullYear();
        if (entry.completionYear < birthYear) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Completion year cannot be earlier than applicant's year of birth", path: ['educations', idx, 'completionYear'] });
        }
      }
    });

    if (data.employmentStatus === EMPLOYMENT_STATUS.EMPLOYED && !data.organization) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Organization name is required for employed applicants', path: ['organization'] });
    }
  });
}

export type Stage4Input = z.infer<ReturnType<typeof buildStage4Schema>>;
