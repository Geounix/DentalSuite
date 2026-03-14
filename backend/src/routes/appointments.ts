import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

const DEFAULT_LIMIT = 50;

const appointmentSchema = z.object({
  patientId: z.number().int().positive(),
  procedure: z.string().min(1),
  scheduledAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  duration: z.number().int().positive(),
  doctorId: z.number().int().positive().optional().nullable(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no-show']).optional(),
  notes: z.string().optional().nullable(),
});

const updateAppointmentSchema = appointmentSchema.partial();

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 200);
  const offset = Number(req.query.offset) || 0;
  const date = req.query.date ? String(req.query.date) : undefined;
  const patientId = req.query.patientId ? Number(req.query.patientId) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;

  const where: any = { deletedAt: null };
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.scheduledAt = { gte: start, lt: end };
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({ where, orderBy: { scheduledAt: 'desc' }, skip: offset, take: limit }),
    prisma.appointment.count({ where }),
  ]);
  res.json({ appointments, total, limit, offset });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const appt = await prisma.appointment.findFirst({ where: { id, deletedAt: null } });
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ appointment: appt });
}));

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const { scheduledAt, ...rest } = parsed.data;
  const appt = await prisma.appointment.create({
    data: { ...rest, scheduledAt: new Date(scheduledAt) },
  });
  res.status(201).json({ appointment: appt });
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.appointment.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Appointment not found' });

  const parsed = updateAppointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const { scheduledAt, ...rest } = parsed.data;
  const appt = await prisma.appointment.update({
    where: { id },
    data: { ...rest, ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}) },
  });
  res.json({ appointment: appt });
}));

// Soft delete – admin or doctor only
router.delete('/:id', requireRole(['admin', 'doctor']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.appointment.findFirst({ where: { id, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: 'Appointment not found' });
  await prisma.appointment.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(204).send();
}));

export default router;
