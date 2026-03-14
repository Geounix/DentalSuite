import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createInsuranceSchema, updateInsuranceSchema } from './schemas/insurance';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (_req, res) => {
  const ins = await prisma.insurance.findMany({
    orderBy: { createdAt: 'desc' },
    include: { plans: { include: { procedures: true } } },
  });
  res.json({ insurances: ins });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const ins = await prisma.insurance.findUnique({
    where: { id },
    include: { plans: { include: { procedures: true } } },
  });
  if (!ins) return res.status(404).json({ error: 'Insurance not found' });
  res.json({ insurance: ins });
}));

// ── Insurance CRUD (admin only) ─────────────────────────────────────────────
router.post('/', requireRole(['admin']), asyncHandler(async (req, res) => {
  const parsed = createInsuranceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const ins = await prisma.insurance.create({ data: parsed.data });
  res.status(201).json({ insurance: ins });
}));

router.put('/:id', requireRole(['admin']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateInsuranceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const ins = await prisma.insurance.update({ where: { id }, data: parsed.data });
  res.json({ insurance: ins });
}));

router.delete('/:id', requireRole(['admin']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.insurance.delete({ where: { id } });
  res.status(204).send();
}));

// ── Plans ────────────────────────────────────────────────────────────────────
router.get('/:id/plans', asyncHandler(async (req, res) => {
  const insuranceId = Number(req.params.id);
  const plans = await prisma.insurancePlan.findMany({
    where: { insuranceId },
    include: { procedures: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ plans });
}));

router.post('/:id/plans', requireRole(['admin']), asyncHandler(async (req, res) => {
  const insuranceId = Number(req.params.id);
  const { planName, type } = req.body;
  if (!planName) return res.status(400).json({ error: 'planName is required' });
  const plan = await prisma.insurancePlan.create({ data: { planName, type, insuranceId } });
  res.status(201).json({ plan });
}));

router.put('/plans/:planId', requireRole(['admin']), asyncHandler(async (req, res) => {
  const id = Number(req.params.planId);
  const { planName, type } = req.body;
  const plan = await prisma.insurancePlan.update({ where: { id }, data: { planName, type } });
  res.json({ plan });
}));

router.delete('/plans/:planId', requireRole(['admin']), asyncHandler(async (req, res) => {
  const id = Number(req.params.planId);
  await prisma.insuranceProcedure.deleteMany({ where: { planId: id } });
  await prisma.insurancePlan.delete({ where: { id } });
  res.status(204).send();
}));

// ── Plan Procedures ──────────────────────────────────────────────────────────
router.post('/plans/:planId/procedures', requireRole(['admin']), asyncHandler(async (req, res) => {
  const planId = Number(req.params.planId);
  const { name, coverageAmount, copayPercent } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const proc = await prisma.insuranceProcedure.create({
    data: { name, coverageAmount, copayPercent, planId },
  });
  res.status(201).json({ procedure: proc });
}));

router.put('/procedures/:id', requireRole(['admin']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, coverageAmount, copayPercent } = req.body;
  const proc = await prisma.insuranceProcedure.update({ where: { id }, data: { name, coverageAmount, copayPercent } });
  res.json({ procedure: proc });
}));

router.delete('/procedures/:id', requireRole(['admin']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.insuranceProcedure.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
