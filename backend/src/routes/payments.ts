import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

const DEFAULT_LIMIT = 50;

const createPaymentSchema = z.object({
  patientId: z.number().int().positive(),
  appointmentId: z.number().int().positive().optional().nullable(),
  cotizacionId: z.number().int().positive().optional().nullable(),
  procedure: z.string().optional().nullable(),
  originalAmount: z.number().nonnegative(),
  insuranceCoverage: z.number().nonnegative().optional().default(0),
  amountPaid: z.number().nonnegative().optional().default(0),
  paymentMethod: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
  paymentType: z.string().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    id: z.number().optional(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().default(1)
  })).optional(),
});

const addTransactionSchema = z.object({
  amount: z.number().positive(),
  method: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 200);
  const offset = Number(req.query.offset) || 0;
  const patientId = req.query.patientId ? Number(req.query.patientId) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;

  const where: any = { deletedAt: null };
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: { patient: { select: { name: true } } },
    }),
    prisma.payment.count({ where }),
  ]);

  const mapped = payments.map(p => ({ ...p, patientName: p.patient?.name }));
  res.json({ payments: mapped, total, limit, offset });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const payment = await prisma.payment.findFirst({ where: { id, deletedAt: null } });
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json({ payment });
}));

// Transactions for a payment
router.get('/:id/transactions', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const txs = await prisma.paymentTransaction.findMany({
    where: { paymentId: id },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ transactions: txs });
}));

router.post('/:id/transactions', asyncHandler(async (req, res) => {
  const paymentId = Number(req.params.id);
  const parsed = addTransactionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const { amount, method, transactionId, notes } = parsed.data;

  const tx = await prisma.paymentTransaction.create({
    data: { paymentId, amount, method, transactionId, notes },
  });

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  const newAmountPaid = (payment.amountPaid || 0) + amount;
  const newStatus = newAmountPaid >= payment.finalAmount ? 'paid' : 'pending';
  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { amountPaid: newAmountPaid, status: newStatus },
    include: { patient: { select: { name: true } } },
  });

  if (payment.cotizacionId) {
    const quote = await prisma.cotizacion.findUnique({ where: { id: payment.cotizacionId } });
    if (quote) {
      const qNewAmount = quote.amountPaid + amount;
      const qNewStatus = qNewAmount >= quote.total ? 'paid' : 'partial';
      await prisma.cotizacion.update({
        where: { id: payment.cotizacionId },
        data: { amountPaid: qNewAmount, status: qNewStatus }
      });
    }
  }

  res.status(201).json({ transaction: tx, payment: { ...updated, patientName: updated.patient?.name } });
}));

router.post('/', asyncHandler(async (req, res) => {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const { patientId, appointmentId, cotizacionId, procedure, items, originalAmount, insuranceCoverage = 0, amountPaid = 0, paymentMethod, transactionId, paymentType, notes } = parsed.data;
  const finalAmount = originalAmount - insuranceCoverage;

  let status = 'unpaid';
  if (String(paymentType).toLowerCase() === 'partial' && amountPaid > 0) {
    status = 'pending';
  } else if (amountPaid >= finalAmount) {
    status = 'paid';
  } else if (amountPaid > 0) {
    status = 'pending';
  }

  const payment = await prisma.payment.create({
    data: { patientId, appointmentId, cotizacionId, procedure, items: items ?? undefined, originalAmount, insuranceCoverage, finalAmount, amountPaid, paymentMethod, transactionId, notes, status },
    include: { patient: { select: { name: true } } },
  });
  res.status(201).json({ payment: { ...payment, patientName: (payment as any).patient?.name } });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.payment.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Payment not found' });

  const update = req.body;
  if (update.originalAmount !== undefined || update.insuranceCoverage !== undefined) {
    const o = Number(update.originalAmount ?? exists.originalAmount);
    const i = Number(update.insuranceCoverage ?? exists.insuranceCoverage);
    update.finalAmount = o - i;
  }
  const payment = await prisma.payment.update({ where: { id }, data: update });
  res.json({ payment });
}));

// Admin-only hard financial records: soft delete only
router.delete('/:id', requireRole(['admin']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.payment.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Payment not found' });
  await prisma.payment.update({ where: { id }, data: { deletedAt: new Date() } });

  if (exists.cotizacionId) {
    const quote = await prisma.cotizacion.findUnique({ where: { id: exists.cotizacionId } });
    if (quote) {
      const newPaid = Math.max(0, quote.amountPaid - exists.amountPaid);
      const newStatus = newPaid <= 0 ? 'pending' : (newPaid >= quote.total ? 'paid' : 'partial');
      await prisma.cotizacion.update({ 
        where: { id: exists.cotizacionId }, 
        data: { amountPaid: newPaid, status: newStatus } 
      });
    }
  }

  res.status(204).send();
}));

export default router;
