import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createPatientSchema, updatePatientSchema } from './schemas/patient';

const router = Router();
router.use(requireAuth);

const DEFAULT_LIMIT = 50;

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 200);
  const offset = Number(req.query.offset) || 0;
  const search = req.query.search ? String(req.query.search) : undefined;

  const where: any = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nationalId: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
    prisma.patient.count({ where }),
  ]);
  res.json({ patients, total, limit, offset });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const patient = await prisma.patient.findFirst({ where: { id, deletedAt: null } });
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json({ patient });
}));

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const parse = createPatientSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });
  const data = parse.data;
  const patient = await prisma.patient.create({
    data: { ...data, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null },
  });
  res.status(201).json({ patient });
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.patient.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Patient not found' });

  const parse = updatePatientSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });
  const data = parse.data;
  const patient = await prisma.patient.update({
    where: { id },
    data: { ...data, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined },
  });
  res.json({ patient });
}));

// Soft delete
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.patient.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Patient not found' });
  await prisma.patient.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(204).send();
}));

export default router;
