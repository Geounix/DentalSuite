import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import { createInsuranceSchema, updateInsuranceSchema } from './schemas/insurance';

const router = Router();
router.use(requireAuth);

const isAdmin = (req: any) => req.user && req.user.role === 'admin';

router.get('/', async (req, res) => {
  try {
    const ins = await prisma.insurance.findMany({ orderBy: { createdAt: 'desc' }, include: { plans: { include: { procedures: true } } } });
    res.json({ insurances: ins });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ins = await prisma.insurance.findUnique({ where: { id }, include: { plans: { include: { procedures: true } } } });
    if (!ins) return res.status(404).json({ error: 'Not found' });
    res.json({ insurance: ins });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Plans: create/list under an insurance
router.post('/:id/plans', async (req, res) => {
  try {
    const insuranceId = Number(req.params.id);
    const { planName, type } = req.body;
    if (!planName) return res.status(400).json({ error: 'planName required' });
    const plan = await prisma.insurancePlan.create({ data: { planName, type, insuranceId } });
    res.status(201).json({ plan });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/plans', async (req, res) => {
  try {
    const insuranceId = Number(req.params.id);
    const plans = await prisma.insurancePlan.findMany({ where: { insuranceId }, include: { procedures: true }, orderBy: { createdAt: 'desc' } });
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update / delete plan
router.put('/plans/:planId', async (req, res) => {
  try {
    const id = Number(req.params.planId);
    const { planName, type } = req.body;
    const plan = await prisma.insurancePlan.update({ where: { id }, data: { planName, type } });
    res.json({ plan });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/plans/:planId', async (req, res) => {
  try {
    const id = Number(req.params.planId);
    // delete associated procedures first
    await prisma.insuranceProcedure.deleteMany({ where: { planId: id } });
    await prisma.insurancePlan.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Procedures under plan
router.post('/plans/:planId/procedures', async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const { name, coverageAmount, copayPercent } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const proc = await prisma.insuranceProcedure.create({ data: { name, coverageAmount: coverageAmount ?? undefined, copayPercent: copayPercent ?? undefined, planId } });
    res.status(201).json({ procedure: proc });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/procedures/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, coverageAmount, copayPercent } = req.body;
    const proc = await prisma.insuranceProcedure.update({ where: { id }, data: { name, coverageAmount, copayPercent } });
    res.json({ procedure: proc });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/procedures/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.insuranceProcedure.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
    const parsed = createInsuranceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const ins = await prisma.insurance.create({ data: parsed.data });
    res.status(201).json({ insurance: ins });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
    const id = Number(req.params.id);
    const parsed = updateInsuranceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const ins = await prisma.insurance.update({ where: { id }, data: parsed.data });
    res.json({ insurance: ins });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
    const id = Number(req.params.id);
    await prisma.insurance.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
