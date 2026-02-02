import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  try {
    const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return res.status(404).json({ error: 'Not found' });
    res.json({ payment });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patientId, appointmentId, originalAmount, insuranceCoverage = 0, amountPaid = 0, paymentMethod, transactionId } = req.body;
    if (!patientId || originalAmount == null) return res.status(400).json({ error: 'Missing fields' });
    const final = Number(originalAmount) - Number(insuranceCoverage);
    const payment = await prisma.payment.create({ data: { patientId: Number(patientId), appointmentId: appointmentId ? Number(appointmentId) : null, originalAmount: Number(originalAmount), insuranceCoverage: Number(insuranceCoverage), finalAmount: final, amountPaid: Number(amountPaid), paymentMethod, transactionId } });
    res.status(201).json({ payment });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const update = req.body;
    if (update.originalAmount || update.insuranceCoverage) update.finalAmount = (Number(update.originalAmount ?? 0) - Number(update.insuranceCoverage ?? 0));
    const payment = await prisma.payment.update({ where: { id }, data: update });
    res.json({ payment });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.payment.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
