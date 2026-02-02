import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  try {
    const appts = await prisma.appointment.findMany({ orderBy: { scheduledAt: 'desc' } });
    res.json({ appointments: appts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const appt = await prisma.appointment.findUnique({ where: { id } });
    if (!appt) return res.status(404).json({ error: 'Not found' });
    res.json({ appointment: appt });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patientId, procedure, scheduledAt, duration, doctorId, notes } = req.body;
    if (!patientId || !procedure || !scheduledAt || !duration) return res.status(400).json({ error: 'Missing fields' });
    const appt = await prisma.appointment.create({ data: { patientId: Number(patientId), procedure, scheduledAt: new Date(scheduledAt), duration: Number(duration), doctorId: doctorId ? Number(doctorId) : null, notes } });
    res.status(201).json({ appointment: appt });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const update = req.body;
    if (update.scheduledAt) update.scheduledAt = new Date(update.scheduledAt);
    const appt = await prisma.appointment.update({ where: { id }, data: update });
    res.json({ appointment: appt });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.appointment.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
