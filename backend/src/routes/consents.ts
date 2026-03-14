import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createConsentSchema, updateConsentSchema } from './schemas/consent';

const router = Router();
router.use(requireAuth);

const DEFAULT_LIMIT = 50;

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 200);
  const offset = Number(req.query.offset) || 0;
  const patientId = req.query.patientId ? Number(req.query.patientId) : undefined;

  const where: any = { deletedAt: null };
  if (patientId) where.patientId = patientId;

  const [consents, total] = await Promise.all([
    prisma.consent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
    prisma.consent.count({ where }),
  ]);
  res.json({ consents, total, limit, offset });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.consent.findFirst({ where: { id, deletedAt: null } });
  if (!item) return res.status(404).json({ error: 'Consent not found' });
  res.json({ consent: item });
}));

router.post('/', asyncHandler(async (req, res) => {
  const parsed = createConsentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const { signedAt, ...rest } = parsed.data;
  const item = await prisma.consent.create({ data: { ...rest, ...(signedAt ? { signedAt: new Date(signedAt) } : {}) } });
  res.status(201).json({ consent: item });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.consent.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Consent not found' });

  const parsed = updateConsentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const { signedAt, ...rest } = parsed.data;
  const item = await prisma.consent.update({ where: { id }, data: { ...rest, ...(signedAt ? { signedAt: new Date(signedAt) } : {}) } });
  res.json({ consent: item });
}));

router.post('/:id/sign', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.consent.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Consent not found' });

  const { signerName } = req.body;
  if (!signerName) return res.status(400).json({ error: 'signerName is required' });
  const item = await prisma.consent.update({ where: { id }, data: { signerName, signedAt: new Date() } });
  res.json({ consent: item });
}));

// Soft delete – admin only
router.delete('/:id', requireRole(['admin']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.consent.findFirst({ where: { id, deletedAt: null } });
  if (!item) return res.status(404).json({ error: 'Consent not found' });
  await prisma.consent.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(204).send();
}));

export default router;
