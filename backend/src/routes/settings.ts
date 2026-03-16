import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Allowed MIME types for logos
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const dest = path.join(__dirname, '..', '..', 'uploads', 'system');
    try {
      await fs.mkdir(dest, { recursive: true });
      cb(null, dest);
    } catch (err: any) {
      cb(err, '');
    }
  },
  filename: (_req, file, cb) => {
    const unique = `logo-${Date.now()}`;
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${unique}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB for logos
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}. Allowed: JPEG, PNG, WebP`));
    }
  },
});

// Helper to get or create default settings
const getSettings = async () => {
  let settings = await prisma.clinicSettings.findFirst();
  if (!settings) {
    settings = await prisma.clinicSettings.create({
      data: { name: 'DentaCare' },
    });
  }
  return settings;
};

// GET /api/settings - Public or general auth route
router.get('/', asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  res.json({ settings });
}));

// PUT /api/settings - Admin only
router.put('/', requireAuth as any, requireRole(['admin']), asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const { name, logoUrl } = req.body;
  
  const updated = await prisma.clinicSettings.update({
    where: { id: settings.id },
    data: {
      name: name !== undefined ? String(name) : settings.name,
      logoUrl: logoUrl !== undefined ? String(logoUrl) : settings.logoUrl,
    },
  });
  
  res.json({ settings: updated });
}));

// POST /api/settings/logo - Admin only logo upload
router.post('/logo', requireAuth as any, requireRole(['admin']), upload.single('logo'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No logo file uploaded' });
  const { path: filePath } = req.file as Express.Multer.File & { path: string };
  
  // Store relative key so client can access via /uploads/system/...
  const rel = path.relative(path.join(__dirname, '..', '..', 'uploads'), filePath).replace(/\\/g, '/');
  
  const settings = await getSettings();
  
  // Update the settings with the new logo URL
  const updated = await prisma.clinicSettings.update({
    where: { id: settings.id },
    data: { logoUrl: rel },
  });
  
  res.status(200).json({ settings: updated });
}));

export default router;
