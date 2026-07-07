/**
 * lib/validation/schemas/stage1.schema.ts
 * Registration Stage 1 - Applicant Personal Information.
 * Flat form-shape + refineStage1 for conditional (birth place / citizenship) rules.
 */
import { z } from 'zod';
import {
  dateOfBirthField,
  emailField,
  iso3Field,
  nameField,
  optionalNameField,
  phoneField,
  sexIdField,
} from '../common';
import { RULES } from '../rules';

export const stage1FormShape = z.object({
  firstName: nameField('First name'),
  middleName: optionalNameField('Middle name'),
  lastName: nameField('Last name'),
  sexId: sexIdField,
  dateOfBirth: dateOfBirthField,
  nationalityCode: iso3Field('Nationality code'),
  phoneNumber: phoneField,
  email: emailField,
  bornInTanzania: z.boolean(),
  placeOfBirthStreetId: z.string().optional(),
  countryOfBirth: z.string().optional(),
  cityOfBirth: z.string().optional(),
  citizenshipTypeId: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  naturalizationCertificateNumber: z.string().optional(),
  naturalizationIssuePlace: z.string().optional(),
  naturalizationIssueDate: z.string().optional(),
});
export type Stage1FormValues = z.infer<typeof stage1FormShape>;

export function refineStage1(data: Stage1FormValues, ctx: z.RefinementCtx) {
  if (data.bornInTanzania) {
    if (!data.placeOfBirthStreetId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Place of birth street is required', path: ['placeOfBirthStreetId'] });
  } else {
    if (!data.countryOfBirth) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Country of birth code is required for foreign-born citizens', path: ['countryOfBirth'] });
    if (!data.cityOfBirth) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'City of birth is required for foreign-born citizens', path: ['cityOfBirth'] });
    } else if (data.cityOfBirth.length > RULES.UI_CITY_MAX) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `City of birth cannot exceed ${RULES.UI_CITY_MAX} characters`, path: ['cityOfBirth'] });
    }
  }

  if (data.citizenshipTypeId === RULES.CITIZENSHIP_TYPE.NATURALIZATION) {
    if (!data.naturalizationCertificateNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Naturalization certificate number is required', path: ['naturalizationCertificateNumber'] });
    if (!data.naturalizationIssuePlace) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Naturalization issue place is required', path: ['naturalizationIssuePlace'] });
    if (!data.naturalizationIssueDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Naturalization issue date is required', path: ['naturalizationIssueDate'] });
    } else if (new Date(data.naturalizationIssueDate) > new Date()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Naturalization issue date cannot be in the future', path: ['naturalizationIssueDate'] });
    }
  }
}

export const stage1FormSchema = stage1FormShape.superRefine(refineStage1);
export type Stage1Input = z.infer<typeof stage1FormSchema>;
