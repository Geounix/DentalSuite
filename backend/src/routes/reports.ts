import { Router } from 'express';
import { runReportSchema } from './schemas/report';
import { requireAuth } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();
router.use(requireAuth);

router.get('/list', (_req, res) => {
  res.json({ reports: ['monthlyRevenue', 'proceduresFrequency', 'appointmentsByStatus'] });
});

router.post('/run', async (req, res) => {
  try {
    const parsed = runReportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const { type, startDate, endDate, groupBy } = parsed.data;
    // implement a couple of simple reports
    if (type === 'monthlyRevenue') {
      const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));
      const end = endDate ? new Date(endDate) : new Date();
      const rows = await prisma.payment.findMany({ where: { createdAt: { gte: start, lte: end } } });
      const total = rows.reduce((s, r) => s + (r.amountPaid ?? 0), 0);
      return res.json({ meta: { total }, data: rows });
    }
    if (type === 'appointmentsByStatus') {
      const rows = await prisma.appointment.groupBy({ by: ['status'], _count: { status: true } });
      return res.json({ data: rows });
    }
    return res.status(400).json({ error: 'Unknown report type' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
