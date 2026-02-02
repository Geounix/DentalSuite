import { z } from 'zod';

export const createPatientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  nationalId: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  insuranceProvider: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();
