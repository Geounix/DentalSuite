import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createPatientSchema, updatePatientSchema } from './schemas/patient';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  try {
    const patients = await prisma.patient.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ patients });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ error: 'Not found' });
    res.json({ patient });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const parse = createPatientSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors });
    const data = parse.data;
    const patient = await prisma.patient.create({ data: { ...data, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null } });
    res.status(201).json({ patient });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const parse = updatePatientSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors });
    const data = parse.data;
    const patient = await prisma.patient.update({ where: { id }, data: { ...data, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined } });
    res.json({ patient });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.patient.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
