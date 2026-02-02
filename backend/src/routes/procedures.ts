import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  try {
    const procs = await prisma.dentalProcedure.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ procedures: procs });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const proc = await prisma.dentalProcedure.findUnique({ where: { id } });
    if (!proc) return res.status(404).json({ error: 'Not found' });
    res.json({ procedure: proc });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patientId, toothNumber, condition, treatment, status, doctorId, cost, date, notes } = req.body;
    if (!patientId || toothNumber == null) return res.status(400).json({ error: 'Missing fields' });
    const proc = await prisma.dentalProcedure.create({ data: { patientId: Number(patientId), toothNumber: Number(toothNumber), condition: condition || '', treatment: treatment || '', status: status || 'planned', doctorId: doctorId ? Number(doctorId) : null, cost: cost ? Number(cost) : undefined, date: date ? new Date(date) : undefined, notes } });
    res.status(201).json({ procedure: proc });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const update = req.body;
    if (update.date) update.date = new Date(update.date);
    const proc = await prisma.dentalProcedure.update({ where: { id }, data: update });
    res.json({ procedure: proc });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.dentalProcedure.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
