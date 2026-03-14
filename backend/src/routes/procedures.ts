import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

const DEFAULT_LIMIT = 50;

const procedureSchema = z.object({
  patientId: z.number().int().positive(),
  toothNumber: z.number().int().min(1).max(52),
  condition: z.string().min(1),
  treatment: z.string().min(1),
  status: z.enum(['planned', 'in-progress', 'completed', 'cancelled']).optional().default('planned'),
  doctorId: z.number().int().positive().optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateProcedureSchema = procedureSchema.partial();

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 200);
  const offset = Number(req.query.offset) || 0;
  const patientId = req.query.patientId ? Number(req.query.patientId) : undefined;

  const where: any = { deletedAt: null };
  if (patientId) where.patientId = patientId;

  const [procedures, total] = await Promise.all([
    prisma.dentalProcedure.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
    prisma.dentalProcedure.count({ where }),
  ]);
  res.json({ procedures, total, limit, offset });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const proc = await prisma.dentalProcedure.findFirst({ where: { id, deletedAt: null } });
  if (!proc) return res.status(404).json({ error: 'Procedure not found' });
  res.json({ procedure: proc });
}));

router.post('/', asyncHandler(async (req, res) => {
  const parsed = procedureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const { date, ...rest } = parsed.data;
  const proc = await prisma.dentalProcedure.create({
    data: { ...rest, date: date ? new Date(date) : undefined },
  });
  res.status(201).json({ procedure: proc });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.dentalProcedure.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Procedure not found' });

  const parsed = updateProcedureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const { date, ...rest } = parsed.data;
  const proc = await prisma.dentalProcedure.update({
    where: { id },
    data: { ...rest, ...(date !== undefined ? { date: date ? new Date(date) : null } : {}) },
  });
  res.json({ procedure: proc });
}));

// Soft delete – admin or doctor only
router.delete('/:id', requireRole(['admin', 'doctor']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.dentalProcedure.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Procedure not found' });
  await prisma.dentalProcedure.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(204).send();
}));

export default router;
