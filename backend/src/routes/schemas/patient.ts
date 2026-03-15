import { z } from 'zod';

const emptyStringToUndefined = z.literal('').transform(() => undefined);

export const createPatientSchema = z.object({
  name: z.string().min(1),
  email: z.union([z.string().email(), z.literal('')]).nullish().transform(e => e === '' ? null : e),
  nationalId: z.string().nullish().transform(e => e === '' ? null : e),
  phone: z.string().nullish().transform(e => e === '' ? null : e),
  dateOfBirth: z.string().nullish().transform(e => e === '' ? null : e),
  address: z.string().nullish().transform(e => e === '' ? null : e),
  insuranceProvider: z.string().nullish().transform(e => e === '' ? null : e),
  // Allow frontend sending "insurance" key by mistake
  insurance: z.string().nullish().transform(e => e === '' ? null : e),
}).transform(data => {
  const parsed = { ...data };
  if (parsed.insurance && !parsed.insuranceProvider) parsed.insuranceProvider = parsed.insurance;
  delete parsed.insurance;
  return parsed;
});

export const updatePatientSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.union([z.string().email(), z.literal('')]).nullish().transform(e => e === '' ? null : e),
  nationalId: z.string().nullish().transform(e => e === '' ? null : e),
  phone: z.string().nullish().transform(e => e === '' ? null : e),
  dateOfBirth: z.string().nullish().transform(e => e === '' ? null : e),
  address: z.string().nullish().transform(e => e === '' ? null : e),
  insuranceProvider: z.string().nullish().transform(e => e === '' ? null : e),
  insurance: z.string().nullish().transform(e => e === '' ? null : e),
}).transform(data => {
  const parsed = { ...data };
  if (parsed.insurance && !parsed.insuranceProvider) parsed.insuranceProvider = parsed.insurance;
  delete parsed.insurance;
  return parsed;
});
