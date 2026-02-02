import { z } from 'zod';

export const createConsentSchema = z.object({
  patientId: z.number(),
  templateId: z.string().optional(),
  formData: z.any().optional(),
  signerName: z.string().optional(),
  signedAt: z.string().optional(),
  documentId: z.number().optional(),
});

export const updateConsentSchema = createConsentSchema.partial();
