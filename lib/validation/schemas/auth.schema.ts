/**
 * lib/validation/schemas/auth.schema.ts
 * login / register / verifyOtp / resendOtp / forgotPasswordIdentifier /
 * verifyResetOtp / resetPassword.
 */
import { z } from 'zod';
import {
  emailField,
  nameField,
  otpCodeField,
  passwordField,
  phoneField,
  sexIdField,
  withConfirmPassword,
} from '../common';
import { RULES } from '../rules';

export const loginSchema = z.object({
  identifier: z.string({ required_error: 'Email is required' }).trim().min(1, 'Email is required').email('Valid email format required'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = withConfirmPassword(
  {
    firstName: nameField('First name'),
    middleName: nameField('Middle name').optional().or(z.literal('')),
    lastName: nameField('Last name'),
    sexId: sexIdField,
    email: emailField,
    phoneNumber: phoneField,
    password: passwordField,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  },
  'password',
  'confirmPassword',
);
export type RegisterInput = z.infer<typeof registerSchema>;

export function toRegisterApiPayload(input: RegisterInput) {
  const { confirmPassword: _confirmPassword, ...rest } = input;
  void _confirmPassword;
  return rest;
}

export const verifyOtpSchema = z.object({
  profileId: z.string({ required_error: 'Missing profile reference' }).min(1),
  otpCode: otpCodeField,
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const resendOtpSchema = z.object({ email: emailField });
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export const forgotPasswordIdentifierSchema = z.object({
  identifier: z
    .string({ required_error: 'Email or phone is required' })
    .trim()
    .min(1, 'Email or phone is required')
    .refine((v) => {
      const isEmail = z.string().email().safeParse(v).success;
      const isPhone = RULES.TZ_PHONE_LOCAL.test(v) || RULES.TZ_PHONE_INTL.test(v);
      return isEmail || isPhone;
    }, 'Enter a valid email address or Tanzania phone number'),
});
export type ForgotPasswordIdentifierInput = z.infer<typeof forgotPasswordIdentifierSchema>;

export const verifyResetOtpSchema = z.object({
  profileId: z.string({ required_error: 'Missing profile reference' }).min(1),
  otpCode: otpCodeField,
});
export type VerifyResetOtpInput = z.infer<typeof verifyResetOtpSchema>;

export const resetPasswordSchema = withConfirmPassword(
  {
    profileId: z.string({ required_error: 'Missing profile reference' }).min(1),
    newPassword: passwordField,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  },
  'newPassword',
  'confirmPassword',
);
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Live checklist helper for the Reset Password "Requirements" UI. */
export function passwordChecklist(password: string, confirmPassword: string) {
  return {
    minLength: password.length >= RULES.PASSWORD_MIN,
    hasCapital: RULES.PASSWORD_HAS_CAPITAL.test(password),
    hasSpecial: RULES.PASSWORD_HAS_SPECIAL.test(password),
    matches: password.length > 0 && password === confirmPassword,
  };
}
