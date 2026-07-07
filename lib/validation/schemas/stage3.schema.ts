/**
 * lib/validation/schemas/stage3.schema.ts
 * Registration Stage 3 - Parents (Father + Mother). Middle name REQUIRED for parents.
 * Factory takes the applicant DOB for the >=16y age-gap check.
 */
import { z } from 'zod';
import { ageInYears } from '../common';
import { RULES } from '../rules';

const parentPersonShape = {
  firstName: z.string({ required_error: 'Parent first name is required' }).trim().min(1, 'Parent first name is required').max(RULES.NAME_MAX, `Parent first name cannot exceed ${RULES.NAME_MAX} characters`),
  middleName: z.string({ required_error: 'Parent middle name is required' }).trim().min(1, 'Parent middle name is required').max(RULES.NAME_MAX, `Parent middle name cannot exceed ${RULES.NAME_MAX} characters`),
  lastName: z.string({ required_error: 'Parent last name is required' }).trim().min(1, 'Parent last name is required').max(RULES.NAME_MAX, `Parent last name cannot exceed ${RULES.NAME_MAX} characters`),
  nationalityCode: z.string({ required_error: 'Parent nationality code is required' }).regex(/^[A-Z]{3}$/, 'Parent nationality must be a valid 3-letter ISO-3166-1 alpha-3 code'),
  dateOfBirth: z.string().optional(),
  residenceInTanzania: z.boolean(),
  residenceStreetId: z.string().optional(),
  residenceCountry: z.string().optional(),
  residenceCity: z.string().optional(),
  phoneNumber: z.string().optional().refine((v) => !v || /^(\+255|0)[67]\d{8}$/.test(v), 'Invalid parent phone number format'),
};

const parentPersonSchema = z.object(parentPersonShape);
export type ParentPersonInput = z.infer<typeof parentPersonSchema>;

export function buildStage3Schema(applicantDob?: string) {
  const base = z.object({ father: parentPersonSchema, mother: parentPersonSchema });

  return base.superRefine((data, ctx) => {
    (['father', 'mother'] as const).forEach((role) => {
      const parent = data[role];
      const label = role === 'father' ? 'Father' : 'Mother';

      if (parent.residenceInTanzania) {
        if (!parent.residenceStreetId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} residence street is required for Tanzania residence`, path: [role, 'residenceStreetId'] });
      } else {
        if (!parent.residenceCountry) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} residence country is required`, path: [role, 'residenceCountry'] });
        } else if (parent.residenceCountry === RULES.TANZANIA_ISO3) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Parent residence country cannot be TZA for a foreign-resident parent', path: [role, 'residenceCountry'] });
        }
        if (!parent.residenceCity) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} residence city is required for foreign residence`, path: [role, 'residenceCity'] });
      }

      if (applicantDob && parent.dateOfBirth) {
        const applicantAge = ageInYears(applicantDob);
        const parentAge = ageInYears(parent.dateOfBirth);
        if (parentAge - applicantAge < RULES.PARENT_MIN_AGE_GAP_YEARS) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be at least ${RULES.PARENT_MIN_AGE_GAP_YEARS} years older than the applicant`, path: [role, 'dateOfBirth'] });
        }
      }
    });
  });
}

export type Stage3Input = z.infer<ReturnType<typeof buildStage3Schema>>;
