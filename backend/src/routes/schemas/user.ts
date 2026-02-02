import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().optional(),
  status: z.string().optional(),
  password: z.string().min(6).optional(),
  sendInvite: z.boolean().optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'deleted']).optional()
});
