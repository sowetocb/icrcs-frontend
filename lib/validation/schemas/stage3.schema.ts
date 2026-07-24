/**
 * lib/validation/schemas/stage3.schema.ts
 * Registration Stage 3 - Parents (Father + Mother). Middle name is optional.
 * Factory takes the applicant DOB for the parent age-gap check.
 */
import { z } from 'zod';
import { ageInYears, optionalNameField } from '../common';
import { RULES } from '../rules';

function buildParentPersonSchema(role: 'Father' | 'Mother') {
  return z.object({
    firstName: z
      .string({ required_error: `${role} first name is required` })
      .trim()
      .min(1, `${role} first name is required`)
      .max(RULES.NAME_MAX, `${role} first name cannot exceed ${RULES.NAME_MAX} characters`),
    middleName: optionalNameField(`${role} middle name`),
    lastName: z
      .string({ required_error: `${role} last name is required` })
      .trim()
      .min(1, `${role} last name is required`)
      .max(RULES.NAME_MAX, `${role} last name cannot exceed ${RULES.NAME_MAX} characters`),
    nationalityCode: z
      .string({ required_error: `${role} nationality code is required` })
      .regex(/^[A-Z]{3}$/, `${role} nationality must be a valid 3-letter ISO-3166-1 alpha-3 code`),
    dateOfBirth: z.string().optional(),
    residenceInTanzania: z.boolean(),
    residenceStreetId: z.string().optional(),
    residenceCountry: z.string().optional(),
    residenceCity: z.string().optional(),
    phoneNumber: z
      .string()
      .optional()
      .refine((v) => !v || /^(\+255|0)[67]\d{8}$/.test(v), `Invalid ${role.toLowerCase()} phone number format`),
  });
}

export type ParentPersonInput = z.infer<ReturnType<typeof buildParentPersonSchema>>;

export function buildStage3Schema(applicantDob?: string) {
  const base = z.object({
    father: buildParentPersonSchema('Father'),
    mother: buildParentPersonSchema('Mother'),
  });

  return base.superRefine((data, ctx) => {
    (['father', 'mother'] as const).forEach((role) => {
      const parent = data[role];
      const label = role === 'father' ? 'Father' : 'Mother';

      if (parent.residenceInTanzania) {
        if (!parent.residenceStreetId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} residence street is required for Tanzania residence`,
            path: [role, 'residenceStreetId'],
          });
        }
      } else {
        if (!parent.residenceCountry) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} residence country is required`,
            path: [role, 'residenceCountry'],
          });
        } else if (parent.residenceCountry === RULES.TANZANIA_ISO3) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} residence country cannot be TZA for a foreign-resident parent`,
            path: [role, 'residenceCountry'],
          });
        }
        if (!parent.residenceCity) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} residence city is required for foreign residence`,
            path: [role, 'residenceCity'],
          });
        }
      }

      if (applicantDob && parent.dateOfBirth) {
        const applicantAge = ageInYears(applicantDob);
        const parentAge = ageInYears(parent.dateOfBirth);
        if (parentAge - applicantAge < RULES.PARENT_MIN_AGE_GAP_YEARS) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} must be at least ${RULES.PARENT_MIN_AGE_GAP_YEARS} years older than the applicant`,
            path: [role, 'dateOfBirth'],
          });
        }
      }
    });
  });
}

export type Stage3Input = z.infer<ReturnType<typeof buildStage3Schema>>;
