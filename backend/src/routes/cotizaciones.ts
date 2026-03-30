import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  quantity: z.number().default(1),
  price: z.number(),
});

const createCotizacionSchema = z.object({
  patientId: z.number().int().positive(),
  title: z.string().min(1),
  items: z.array(itemSchema).min(1),
  discount: z.number().nonnegative().optional().default(0),
  tax: z.number().nonnegative().optional().default(0),
  notes: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  status: z.string().optional().default('pending'),
});

const addPaymentSchema = z.object({
  amount: z.number().positive(),
  notes: z.string().optional().nullable(),
});

// GET /api/cotizaciones
router.get('/', asyncHandler(async (req, res) => {
  const patientId = req.query.patientId ? Number(req.query.patientId) : undefined;
  const where: any = { deletedAt: null };
  if (patientId) where.patientId = patientId;

  const cotz = await (prisma as any).cotizacion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { patient: { select: { name: true } } },
  });
  res.json({ cotizaciones: cotz.map((c: any) => ({ ...c, patientName: c.patient?.name })) });
}));

// GET /api/cotizaciones/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const cotz = await (prisma as any).cotizacion.findFirst({
    where: { id, deletedAt: null },
    include: { patient: { select: { name: true } } },
  });
  if (!cotz) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json({ cotizacion: { ...cotz, patientName: cotz.patient?.name } });
}));

// POST /api/cotizaciones
router.post('/', asyncHandler(async (req, res) => {
  const parsed = createCotizacionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const { items, discount = 0, tax = 0, validUntil, ...rest } = parsed.data;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal - discount + tax;
  const cotz = await (prisma as any).cotizacion.create({
    data: {
      ...rest,
      items,
      subtotal,
      discount,
      tax,
      total,
      amountPaid: 0,
      status: rest.status || 'pending',
      validUntil: validUntil ? new Date(validUntil) : null,
    },
    include: { patient: { select: { name: true } } },
  });
  res.status(201).json({ cotizacion: { ...cotz, patientName: cotz.patient?.name } });
}));

// PUT /api/cotizaciones/:id  (update title/notes/status/items/discount/tax)
router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await (prisma as any).cotizacion.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Cotización no encontrada' });
  const { items, discount, tax, validUntil, ...rest } = req.body;
  const updateData: any = { ...rest };
  if (items) {
    updateData.items = items;
    const sub = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    updateData.subtotal = sub;
    updateData.total = sub - (discount ?? exists.discount) + (tax ?? exists.tax);
  }
  if (discount !== undefined) updateData.discount = discount;
  if (tax !== undefined) updateData.tax = tax;
  if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
  const updated = await (prisma as any).cotizacion.update({
    where: { id },
    data: updateData,
    include: { patient: { select: { name: true } } },
  });
  res.json({ cotizacion: { ...updated, patientName: updated.patient?.name } });
}));

// POST /api/cotizaciones/:id/payments — register a payment against a quote
router.post('/:id/payments', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const parsed = addPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const cotz = await (prisma as any).cotizacion.findFirst({ where: { id, deletedAt: null } });
  if (!cotz) return res.status(404).json({ error: 'Cotización no encontrada' });

  const newPaid = Number(cotz.amountPaid) + parsed.data.amount;
  const remaining = Number(cotz.total) - newPaid;
  const status = remaining <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

  const updated = await (prisma as any).cotizacion.update({
    where: { id },
    data: { amountPaid: newPaid, status },
    include: { patient: { select: { name: true } } },
  });
  res.json({ cotizacion: { ...updated, patientName: updated.patient?.name } });
}));

// DELETE /api/cotizaciones/:id (soft delete)
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await (prisma as any).cotizacion.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Cotización no encontrada' });
  await (prisma as any).cotizacion.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(204).send();
}));

export default router;
