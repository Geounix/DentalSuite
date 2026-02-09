import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  try {
    const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, include: { patient: true } });
    // attach patientName for frontend convenience
    const mapped = payments.map(p => ({ ...p, patientName: p.patient ? p.patient.name : undefined }));
    res.json({ payments: mapped });
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

// transactions for a payment
router.get('/:id/transactions', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const txs = await prisma.paymentTransaction.findMany({ where: { paymentId: id }, orderBy: { createdAt: 'asc' } });
    res.json({ transactions: txs });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/transactions', async (req, res) => {
  try {
    const paymentId = Number(req.params.id);
    const { amount, method, transactionId, notes } = req.body;
    if (amount == null) return res.status(400).json({ error: 'Missing amount' });

    // create transaction
    const tx = await prisma.paymentTransaction.create({ data: { paymentId, amount: Number(amount), method, transactionId, notes } });

    // update payment totals and status
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    const newAmountPaid = (payment.amountPaid || 0) + Number(amount);
    const newStatus = newAmountPaid >= payment.finalAmount ? 'paid' : 'pending';
    const updated = await prisma.payment.update({ where: { id: paymentId }, data: { amountPaid: newAmountPaid, status: newStatus }, include: { patient: true } });

    // include patientName for frontend
    const mappedPayment = { ...updated, patientName: updated.patient ? updated.patient.name : undefined };

    res.status(201).json({ transaction: tx, payment: mappedPayment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    // Debug: log incoming body to diagnose status mismatches
    console.log('POST /payments body:', JSON.stringify(req.body));

    const { patientId, appointmentId, originalAmount, insuranceCoverage = 0, amountPaid = 0, paymentMethod, transactionId, status, paymentType } = req.body;
    if (!patientId || originalAmount == null) return res.status(400).json({ error: 'Missing fields' });
    const final = Number(originalAmount) - Number(insuranceCoverage);
    const amtPaid = Number(amountPaid) || 0;
    // Determine canonical status. If client explicitly marked this as a partial payment
    // (paymentType === 'partial'), treat it as 'pending' when there's any amountPaid.
    let computedStatus = 'unpaid';
    if (String(paymentType).toLowerCase() === 'partial' && amtPaid > 0) {
      computedStatus = 'pending';
    } else if (amtPaid >= final) {
      computedStatus = 'paid';
    } else if (amtPaid > 0) {
      computedStatus = 'pending';
    } else {
      computedStatus = 'unpaid';
    }

    console.log('Computed payment status:', { final, amtPaid, computedStatus });

    const payment = await prisma.payment.create({ data: { patientId: Number(patientId), appointmentId: appointmentId ? Number(appointmentId) : null, originalAmount: Number(originalAmount), insuranceCoverage: Number(insuranceCoverage), finalAmount: final, amountPaid: amtPaid, paymentMethod, transactionId, status: computedStatus }, include: { patient: true } });
    const mappedPayment = { ...payment, patientName: payment.patient ? payment.patient.name : undefined };
    res.status(201).json({ payment: mappedPayment });
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
