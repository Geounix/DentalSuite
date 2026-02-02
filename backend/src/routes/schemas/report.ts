import { z } from 'zod';

export const runReportSchema = z.object({
  type: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['day', 'month', 'year']).optional(),
  filters: z.any().optional(),
});
