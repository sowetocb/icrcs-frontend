/**
 * lib/validation/common.ts
 *
 * Reusable Zod primitives, all reading limits from rules.ts so the frontend
 * rules never drift apart from each other (or from the backend contract).
 */
import { z } from 'zod';
import { RULES } from './rules';
import { isValidIso3 } from './iso3166';

// Names - REGISTRATION_*_NAME_REQUIRED / *_TOO_LONG / NAME_INVALID_CHARACTERS
export const nameField = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(RULES.NAME_MIN, `${label} is required`)
    .max(RULES.NAME_MAX, `${label} cannot exceed ${RULES.NAME_MAX} characters`)
    .regex(
      RULES.NAME_PATTERN,
      'Only letters, spaces, hyphens and apostrophes are allowed',
    );

// Middle name is optional for the applicant (Stage 1) but REQUIRED for parents.
export const optionalNameField = (label: string) =>
  z
    .string()
    .trim()
    .max(RULES.NAME_MAX, `${label} cannot exceed ${RULES.NAME_MAX} characters`)
    .regex(RULES.NAME_PATTERN, 'Only letters, spaces, hyphens and apostrophes are allowed')
    .optional()
    .or(z.literal(''));

// Email - REGISTRATION_EMAIL_REQUIRED / _INVALID / _TOO_LONG
export const emailField = z
  .string({ required_error: 'Email address is required' })
  .trim()
  .min(1, 'Email address is required')
  .max(RULES.EMAIL_MAX, `Email cannot exceed ${RULES.EMAIL_MAX} characters`)
  .email('Invalid email format');

// Phone - normalizes to E.164 (+2557XXXXXXXX). Accepts local or international.
export const phoneField = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .min(1, 'Phone number is required')
  .refine(
    (v) => RULES.TZ_PHONE_LOCAL.test(v) || RULES.TZ_PHONE_INTL.test(v),
    'Phone number must be a valid Tanzania mobile number (e.g. 0712345678 or +255712345678)',
  )
  .transform((v) => (v.startsWith('0') ? `+255${v.slice(1)}` : v));

export const optionalPhoneField = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || RULES.TZ_PHONE_LOCAL.test(v) || RULES.TZ_PHONE_INTL.test(v),
    'Invalid phone number format',
  )
  .transform((v) => (v && v.startsWith('0') ? `+255${v.slice(1)}` : v))
  .optional()
  .or(z.literal(''));

// ISO-3166-1 alpha-3: shape check -> *_INVALID; existence -> COUNTRY_CODE_UNKNOWN.
// NOTE: isValidIso3 checks a small static list (lib/validation/iso3166.ts); the
// app resolves the full set via lib/iso3.ts + getCountries(). Use iso3Field only
// where the static list is sufficient, or prefer a shape-only regex.
export const iso3Field = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .regex(RULES.ISO3_SHAPE, `${label} must be a valid 3-letter ISO-3166-1 alpha-3 code`)
    .refine((v) => isValidIso3(v), `${label} is not a recognized country code`);

// Password - mirrors the Reset Password "Requirements" checklist.
export const passwordField = z
  .string({ required_error: 'Password is required' })
  .min(RULES.PASSWORD_MIN, `Password must be at least ${RULES.PASSWORD_MIN} characters`)
  .regex(RULES.PASSWORD_HAS_CAPITAL, 'Password must contain at least one capital letter')
  .regex(RULES.PASSWORD_HAS_SPECIAL, 'Password must contain at least one special character');

export const withConfirmPassword = <T extends z.ZodRawShape>(
  shape: T,
  passwordKey: keyof T,
  confirmKey: string,
) =>
  z.object(shape).superRefine((data, ctx) => {
    if ((data as Record<string, unknown>)[passwordKey as string] !== (data as Record<string, unknown>)[confirmKey]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: [confirmKey],
      });
    }
  });

// Dates - always sent to the backend as YYYY-MM-DD.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isoDateField = z
  .string({ required_error: 'Date is required' })
  .regex(ISO_DATE, 'Invalid date format. Use YYYY-MM-DD');

export const dateOfBirthField = isoDateField
  .refine((v) => new Date(v) <= new Date(), 'Date of birth cannot be in the future')
  .refine((v) => {
    const years = (Date.now() - new Date(v).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return years <= RULES.MAX_AGE_YEARS;
  }, `Date of birth exceeds maximum allowed age of ${RULES.MAX_AGE_YEARS} years`);

export function ageInYears(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

// Sex / gender - REGISTRATION_SEX_INVALID / REGISTRATION_GENDER_INVALID
export const sexIdField = z.union([z.literal(RULES.SEX.FEMALE), z.literal(RULES.SEX.MALE)], {
  errorMap: () => ({ message: 'Sex must be 1 (Female) or 2 (Male)' }),
});

// OTP - shape only; correctness is server-side.
export const otpCodeField = z
  .string({ required_error: 'Verification code is required' })
  .regex(RULES.OTP_PATTERN, `Enter the ${RULES.OTP_LENGTH}-digit code`);

// Generic file validation - FILE_EMPTY / FILE_TOO_LARGE / FILE_TYPE_NOT_ALLOWED
export const fileField = z
  .instanceof(File, { message: 'File is required' })
  .refine((f) => f.size > 0, 'File is empty or missing')
  .refine((f) => f.size <= RULES.FILE_MAX_BYTES, `File exceeds maximum size of 500KB`)
  .refine(
    (f) => (RULES.FILE_ALLOWED_MIME as readonly string[]).includes(f.type),
    'File type not allowed. Use jpg, png or pdf',
  );

export const optionalFileField = fileField.optional();
