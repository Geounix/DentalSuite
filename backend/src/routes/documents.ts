import { Router, Request } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createDocumentSchema, updateDocumentSchema } from './schemas/document';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();
router.use(requireAuth as any);

const DEFAULT_LIMIT = 50;

// Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/pdf',
  'application/dicom',
  'image/dicom',
];

// Organise uploads by year/month for easier management
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dest = path.join(__dirname, '..', '..', 'uploads', String(year), month);
    try {
      await fs.mkdir(dest, { recursive: true });
      cb(null, dest);
    } catch (err: any) {
      cb(err, '');
    }
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${unique}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}. Allowed: JPEG, PNG, WebP, TIFF, PDF, DICOM`));
    }
  },
});

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 200);
  const offset = Number(req.query.offset) || 0;
  const { patientId, type } = req.query;

  const where: any = {};
  if (patientId) where.patientId = Number(patientId);
  if (type) where.type = String(type);

  const [documents, total] = await Promise.all([
    prisma.document.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
    prisma.document.count({ where }),
  ]);
  res.json({ documents, total, limit, offset });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ document: doc });
}));

// Create document record by metadata (no file upload)
router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const parsed = createDocumentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const doc = await prisma.document.create({ data: { ...parsed.data, uploaderId: req.user?.id } });
  res.status(201).json({ document: doc });
}));

// Upload a physical file and create a document record
router.post('/upload', upload.single('file'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { originalname, filename, path: filePath } = req.file as Express.Multer.File & { path: string };
  const docType = req.body?.type || (req.query?.type as string) || undefined;
  const patientId = req.body?.patientId ? Number(req.body.patientId) : undefined;

  // Store relative key so client can download via /uploads
  const rel = path.relative(path.join(__dirname, '..', '..', 'uploads'), filePath).replace(/\\/g, '/');
  const doc = await prisma.document.create({
    data: { filename: originalname, key: rel, uploaderId: req.user?.id, type: docType, patientId },
  });
  res.status(201).json({ document: doc });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateDocumentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const doc = await prisma.document.update({ where: { id }, data: parsed.data });
  res.json({ document: doc });
}));

// Delete: remove physical file but keep the DB record for audit (soft record)
router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const userRole = String(req.user?.role).toLowerCase();
  const userId = req.user?.id;
  if (userRole !== 'admin' && userId !== doc.uploaderId) {
    return res.status(403).json({ error: 'Forbidden – only admin or uploader can delete this document' });
  }

  // Delete physical file from disk
  if (doc.key) {
    const absolute = path.join(__dirname, '..', '..', 'uploads', doc.key);
    await fs.unlink(absolute).catch(() => null); // Ignore if file already gone
  }

  // Delete DB record
  await prisma.document.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
