import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import { createConsentSchema, updateConsentSchema } from './schemas/consent';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { patientId } = req.query;
    const where: any = {};
    if (patientId) where.patientId = Number(patientId);
    const items = await prisma.consent.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ consents: items });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.consent.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ consent: item });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const parsed = createConsentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const data = parsed.data;
    if (data.signedAt) data.signedAt = new Date(data.signedAt as any);
    const item = await prisma.consent.create({ data });
    res.status(201).json({ consent: item });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = updateConsentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const data = parsed.data;
    if (data.signedAt) data.signedAt = new Date(data.signedAt as any);
    const item = await prisma.consent.update({ where: { id }, data });
    res.json({ consent: item });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/sign', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { signerName } = req.body;
    const item = await prisma.consent.update({ where: { id }, data: { signerName, signedAt: new Date() } });
    res.json({ consent: item });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.consent.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    // only admin or the uploader of the related document (if any) can delete
    if (req.user.role !== 'admin') {
      if (item.documentId) {
        const doc = await prisma.document.findUnique({ where: { id: item.documentId } });
        if (!doc || req.user.id !== doc.uploaderId) return res.status(403).json({ error: 'Forbidden' });
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    await prisma.consent.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
