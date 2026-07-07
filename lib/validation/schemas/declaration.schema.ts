/**
 * lib/validation/schemas/declaration.schema.ts
 * Final "Declaration" step - REGISTRATION_DECLARATION_REQUIRED.
 */
import { z } from 'zod';

export const declarationSchema = z.object({
  confirmed: z.literal(true, {
    errorMap: () => ({ message: 'Declaration must be confirmed to complete registration' }),
  }),
});
export type DeclarationInput = z.infer<typeof declarationSchema>;
