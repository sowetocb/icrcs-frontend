/**
 * lib/validation/schemas/stage2.schema.ts
 * Registration Stage 2 - Residential Address (current + permanent).
 */
import { z } from 'zod';
import { RULES } from '../rules';

const cityField = z.string().trim().max(RULES.UI_CITY_MAX, `City cannot exceed ${RULES.UI_CITY_MAX} characters`);

export const stage2FormShape = z.object({
  currentInTanzania: z.boolean(),
  currentStreetId: z.string().optional(),
  currentCountry: z.string().optional(),
  currentCity: cityField.optional(),
  sameAsCurrent: z.boolean(),
  permanentInTanzania: z.boolean().optional(),
  permanentStreetId: z.string().optional(),
  permanentCountry: z.string().optional(),
  permanentCity: cityField.optional(),
});
export type Stage2FormValues = z.infer<typeof stage2FormShape>;

export function refineStage2(data: Stage2FormValues, ctx: z.RefinementCtx) {
  if (data.currentInTanzania) {
    if (!data.currentStreetId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current street is required', path: ['currentStreetId'] });
  } else {
    if (!data.currentCountry) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current residence country is required', path: ['currentCountry'] });
    } else if (!RULES.ISO3_SHAPE.test(data.currentCountry)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current residence country is not a valid ISO-3166-1 alpha-3 code', path: ['currentCountry'] });
    }
    if (!data.currentCity) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current residence city is required for foreign residence', path: ['currentCity'] });
  }

  if (!data.sameAsCurrent) {
    if (data.permanentInTanzania) {
      if (!data.permanentStreetId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Permanent street is required', path: ['permanentStreetId'] });
    } else {
      if (!data.permanentCountry) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Permanent residence country is required', path: ['permanentCountry'] });
      } else if (!RULES.ISO3_SHAPE.test(data.permanentCountry)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Permanent residence country is not a valid ISO-3166-1 alpha-3 code', path: ['permanentCountry'] });
      }
      if (!data.permanentCity) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Permanent residence city is required for foreign residence', path: ['permanentCity'] });
    }
  }
}

export const stage2Schema = stage2FormShape.superRefine(refineStage2);
