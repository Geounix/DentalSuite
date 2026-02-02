import { z } from 'zod';

export const createDocumentSchema = z.object({
  patientId: z.number().optional(),
  filename: z.string().min(1),
  key: z.string().min(1),
  type: z.string().optional(),
  metadata: z.any().optional(),
});

export const updateDocumentSchema = createDocumentSchema.partial();
