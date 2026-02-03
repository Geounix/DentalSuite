import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import { createDocumentSchema, updateDocumentSchema } from './schemas/document';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();
router.use(requireAuth);

// multer setup: store files under uploads/consents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '..', '..', 'uploads', 'consents');
    fs.mkdir(dest, { recursive: true }).then(() => cb(null, dest)).catch(cb as any);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_');
    cb(null, `${unique}-${safe}`);
  }
});
const upload = multer({ storage });

router.get('/', async (req, res) => {
  try {
    const { patientId, type } = req.query;
    const where: any = {};
    if (patientId) where.patientId = Number(patientId);
    if (type) where.type = String(type);
    const docs = await prisma.document.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// create document by metadata (no file) - keep for programmatic use
router.post('/', async (req, res) => {
  try {
    const parsed = createDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const data = parsed.data;
    const doc = await prisma.document.create({ data: { ...data, uploaderId: req.user?.id } });
    res.status(201).json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// upload a file and create a document record; field name: `file`
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { originalname, filename, path: filePath } = req.file as any;
    const docType = (req.body && req.body.type) || (req.query && req.query.type) || undefined;
    // try to read patientId from the multipart form (will be a string)
    const patientIdRaw = req.body && req.body.patientId;
    const patientId = patientIdRaw ? Number(patientIdRaw) : undefined;
    // store relative key so client can download from /uploads
    const rel = path.relative(path.join(__dirname, '..', '..', 'uploads'), filePath).replace(/\\/g, '/');
    const doc = await prisma.document.create({ data: { filename: originalname, key: rel, uploaderId: req.user?.id, type: docType, patientId } });
    res.status(201).json({ document: doc });
  } catch (err) {
    console.error('upload error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = updateDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const doc = await prisma.document.update({ where: { id }, data: parsed.data });
    res.json({ document: doc });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    // allow admin or uploader
    if (req.user.role !== 'admin' && req.user.id !== doc.uploaderId) return res.status(403).json({ error: 'Forbidden' });
    // delete physical file if exists
    if (doc.key) {
      try {
        const absolute = path.join(__dirname, '..', '..', 'uploads', doc.key);
        await fs.unlink(absolute).catch(() => null);
      } catch (e) {
        // ignore
      }
    }
    await prisma.document.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
