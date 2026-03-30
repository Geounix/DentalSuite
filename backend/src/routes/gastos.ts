import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();
router.use(requireAuth);

const gastoSchema = z.object({
  rnc: z.string().optional(),
  proveedor: z.string().min(1, 'Proveedor requerido'),
  cliente: z.string().optional(),
  nfc: z.string().optional(),
  factura: z.string().optional(),
  fecha: z.string(),
  categoria: z.string().optional(),
  cantidad: z.number(),
  descuento: z.number().default(0),
  itbis: z.number().default(0),
  total: z.number(),
  notas: z.string().optional(),
});

// GET /api/gastos — list with optional filters
router.get('/', async (req, res) => {
  try {
    const { from, to, categoria, proveedor } = req.query as any;
    const where: any = { deletedAt: null };
    if (from || to) {
      where.fecha = {};
      if (from) where.fecha.gte = new Date(from);
      if (to) where.fecha.lte = new Date(to);
    }
    if (categoria) where.categoria = categoria;
    if (proveedor) where.proveedor = { contains: proveedor };
    const gastos = await prisma.gasto.findMany({ where, orderBy: { fecha: 'desc' } });
    return res.json({ gastos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/gastos/summary — KPIs for reports
router.get('/summary', async (req, res) => {
  try {
    const { from, to } = req.query as any;
    const where: any = { deletedAt: null };
    if (from || to) {
      where.fecha = {};
      if (from) where.fecha.gte = new Date(from);
      if (to) where.fecha.lte = new Date(to);
    }
    const gastos = await prisma.gasto.findMany({ where });
    const totalGastos = gastos.reduce((s, g) => s + g.total, 0);
    const totalItbis = gastos.reduce((s, g) => s + g.itbis, 0);
    const totalDescuento = gastos.reduce((s, g) => s + g.descuento, 0);

    // Group by month for chart
    const byMonth: Record<string, number> = {};
    for (const g of gastos) {
      const key = `${g.fecha.getFullYear()}-${String(g.fecha.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + g.total;
    }

    // Group by category
    const byCategoria: Record<string, number> = {};
    for (const g of gastos) {
      const cat = g.categoria || 'Sin categoría';
      byCategoria[cat] = (byCategoria[cat] || 0) + g.total;
    }

    return res.json({ totalGastos, totalItbis, totalDescuento, byMonth, byCategoria });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/gastos
router.post('/', async (req, res) => {
  try {
    const parsed = gastoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const data = parsed.data;
    const gasto = await prisma.gasto.create({
      data: {
        ...data,
        fecha: new Date(data.fecha),
      },
    });
    return res.status(201).json({ gasto });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/gastos/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = gastoSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const data: any = { ...parsed.data };
    if (data.fecha) data.fecha = new Date(data.fecha);
    const gasto = await prisma.gasto.update({ where: { id }, data });
    return res.json({ gasto });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/gastos/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.gasto.update({ where: { id }, data: { deletedAt: new Date() } });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
