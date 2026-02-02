import { z } from 'zod';

export const createInsuranceSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  contact: z.string().optional(),
  notes: z.string().optional(),
  defaultCoverage: z.number().optional(),
});

export const updateInsuranceSchema = createInsuranceSchema.partial();
