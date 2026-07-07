/**
 * lib/validation/schemas/stage6.schema.ts
 * Registration Stage 6 - Family (Emergency Contacts, Relatives, Spouse(s), Children).
 */
import { z } from 'zod';
import { ageInYears } from '../common';
import { RULES } from '../rules';

export const MARITAL_STATUS = {
  SINGLE: 'SINGLE',
  MARRIED: 'MARRIED',
  DIVORCED: 'DIVORCED',
  WIDOWED: 'WIDOWED',
} as const;

const phonePattern = /^(\+255|0)[67]\d{8}$/;
const iso3Pattern = /^[A-Z]{3}$/;

const emergencyContactSchema = z.object({
  order: z.number().int().min(1),
  relationshipTypeId: z.number({ required_error: 'Emergency contact relationship is required' }),
  firstName: z.string({ required_error: 'Emergency contact first name is required' }).trim().min(1, 'Emergency contact first name is required'),
  lastName: z.string({ required_error: 'Emergency contact last name is required' }).trim().min(1, 'Emergency contact last name is required'),
  dateOfBirth: z.string({ required_error: 'Emergency contact date of birth is required' }),
  phoneNumber: z.string({ required_error: 'Emergency contact phone number is required' }).regex(phonePattern, 'Invalid emergency contact phone number format'),
  residenceInTanzania: z.boolean(),
  residenceStreetId: z.string().optional(),
  residenceCountry: z.string().optional(),
  residenceCity: z.string().optional(),
});
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;

const relativeSchema = z.object({
  relationshipTypeId: z.number({ required_error: 'Relative relationship type is required' }),
  firstName: z.string({ required_error: 'Relative first name is required' }).trim().min(1, 'Relative first name is required'),
  lastName: z.string({ required_error: 'Relative last name is required' }).trim().min(1, 'Relative last name is required'),
  nationalityCode: z.string({ required_error: 'Relative nationality code is required' }).regex(iso3Pattern, 'Relative nationality must be a valid 3-letter ISO-3166-1 alpha-3 code'),
  dateOfBirth: z.string({ required_error: 'Relative date of birth is required' }),
  phoneNumber: z.string().optional().refine((v) => !v || phonePattern.test(v), 'Invalid relative phone number format'),
  residenceInTanzania: z.boolean(),
  residenceStreetId: z.string().optional(),
  residenceCountry: z.string().optional(),
  residenceCity: z.string().optional(),
});
export type RelativeInput = z.infer<typeof relativeSchema>;

const spouseSchema = z.object({
  firstName: z.string({ required_error: 'Spouse first name is required' }).trim().min(1, 'Spouse first name is required'),
  lastName: z.string({ required_error: 'Spouse last name is required' }).trim().min(1, 'Spouse last name is required'),
  genderId: z.union([z.literal(RULES.SEX.FEMALE), z.literal(RULES.SEX.MALE)], {
    errorMap: () => ({ message: 'Spouse gender is required' }),
  }),
  dateOfBirth: z.string({ required_error: 'Spouse date of birth is required' }),
  nationalityCode: z.string({ required_error: 'Spouse nationality code is required' }).regex(iso3Pattern, 'Spouse nationality must be a valid 3-letter ISO-3166-1 alpha-3 code'),
  phoneNumber: z.string().optional().refine((v) => !v || phonePattern.test(v), 'Invalid spouse phone number format'),
  residenceInTanzania: z.boolean(),
  residenceStreetId: z.string().optional(),
  residenceCountry: z.string().optional(),
  residenceCity: z.string().optional(),
});
export type SpouseInput = z.infer<typeof spouseSchema>;

const childSchema = z.object({
  firstName: z.string({ required_error: 'Child first name is required' }).trim().min(1, 'Child first name is required'),
  lastName: z.string({ required_error: 'Child last name is required' }).trim().min(1, 'Child last name is required'),
  sexId: z.union([z.literal(RULES.SEX.FEMALE), z.literal(RULES.SEX.MALE)], {
    errorMap: () => ({ message: 'Child sex is required' }),
  }),
  dateOfBirth: z.string({ required_error: 'Child date of birth is required' }),
  nationalityCode: z.string({ required_error: 'Child nationality code is required' }).regex(iso3Pattern, 'Child nationality must be a valid 3-letter ISO-3166-1 alpha-3 code'),
  residenceAddress: z.string({ required_error: 'Child residence address is required' }).min(1, 'Child residence address is required'),
});
export type ChildInput = z.infer<typeof childSchema>;

const stage6FormShape = z.object({
  emergencyContacts: z
    .array(emergencyContactSchema)
    .min(RULES.EMERGENCY_CONTACTS_MIN, 'At least 1 emergency contact is required')
    .max(RULES.EMERGENCY_CONTACTS_MAX, `Too many emergency contacts - maximum ${RULES.EMERGENCY_CONTACTS_MAX} allowed`),
  relatives: z
    .array(relativeSchema)
    .min(RULES.RELATIVES_MIN, 'At least 2 relatives are required')
    .max(RULES.RELATIVES_MAX, `Too many relatives - maximum ${RULES.RELATIVES_MAX} allowed`),
  maritalStatus: z.nativeEnum(MARITAL_STATUS, {
    required_error: 'Marital status is required',
    invalid_type_error: 'Invalid marital status',
  }),
  spouses: z.array(spouseSchema).max(RULES.SPOUSES_MAX, `Too many spouses - maximum ${RULES.SPOUSES_MAX} allowed`),
  hasChildren: z.boolean(),
  children: z.array(childSchema).max(RULES.CHILDREN_MAX, `Too many children - maximum ${RULES.CHILDREN_MAX} allowed`),
  applicantGenderId: z.union([z.literal(RULES.SEX.FEMALE), z.literal(RULES.SEX.MALE)]),
  applicantDob: z.string().optional(),
});
export type Stage6FormValues = z.infer<typeof stage6FormShape>;

export const stage6Schema = stage6FormShape.superRefine((data, ctx) => {
  data.emergencyContacts.forEach((c, idx) => {
    if (ageInYears(c.dateOfBirth) < RULES.CONTACT_MIN_AGE) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Emergency contact must be at least ${RULES.CONTACT_MIN_AGE} years old`, path: ['emergencyContacts', idx, 'dateOfBirth'] });
    }
    if (c.residenceInTanzania && !c.residenceStreetId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Emergency contact residence street is required', path: ['emergencyContacts', idx, 'residenceStreetId'] });
    }
    if (!c.residenceInTanzania) {
      if (!c.residenceCountry) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Emergency contact residence country is required', path: ['emergencyContacts', idx, 'residenceCountry'] });
      if (!c.residenceCity) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Emergency contact residence city is required for foreign residence', path: ['emergencyContacts', idx, 'residenceCity'] });
    }
  });

  data.relatives.forEach((r, idx) => {
    const dob = new Date(r.dateOfBirth);
    const age = ageInYears(r.dateOfBirth);
    if (dob > new Date() || age > RULES.MAX_AGE_YEARS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Relative date of birth is out of valid range', path: ['relatives', idx, 'dateOfBirth'] });
    }
    if (r.residenceInTanzania && !r.residenceStreetId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Relative residence street is required for Tanzania residence', path: ['relatives', idx, 'residenceStreetId'] });
    if (!r.residenceInTanzania && !r.residenceCity) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Relative residence city is required for foreign residence', path: ['relatives', idx, 'residenceCity'] });
  });

  if (data.maritalStatus === MARITAL_STATUS.MARRIED) {
    if (data.spouses.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Spouse information is required for married status', path: ['spouses'] });
    data.spouses.forEach((s, idx) => {
      if (s.genderId === data.applicantGenderId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Spouse must be of the opposite gender to the account owner', path: ['spouses', idx, 'genderId'] });
      if (ageInYears(s.dateOfBirth) < RULES.SPOUSE_MIN_AGE) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Spouse must be at least ${RULES.SPOUSE_MIN_AGE} years old`, path: ['spouses', idx, 'dateOfBirth'] });
      if (s.residenceInTanzania && !s.residenceStreetId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Spouse residence street is required for Tanzania residence', path: ['spouses', idx, 'residenceStreetId'] });
      if (!s.residenceInTanzania && !s.residenceCity) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Spouse residence city is required for foreign residence', path: ['spouses', idx, 'residenceCity'] });
    });
  }

  if (data.hasChildren) {
    if (data.children.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Child information is required when hasChildren is true', path: ['children'] });
    if (data.applicantDob && ageInYears(data.applicantDob) < RULES.MIN_APPLICANT_AGE_FOR_DECLARING_CHILDREN) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `A minor applicant cannot declare children - applicant must be at least ${RULES.MIN_APPLICANT_AGE_FOR_DECLARING_CHILDREN} years old`, path: ['hasChildren'] });
    }
    if (data.applicantDob) {
      const applicantTurns16 = new Date(data.applicantDob);
      applicantTurns16.setFullYear(applicantTurns16.getFullYear() + RULES.MIN_APPLICANT_AGE_FOR_DECLARING_CHILDREN);
      data.children.forEach((child, idx) => {
        if (new Date(child.dateOfBirth) < applicantTurns16) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Declared child must have been born after the applicant turned 16', path: ['children', idx, 'dateOfBirth'] });
      });
    }
  }
});

export type Stage6Input = z.infer<typeof stage6Schema>;
