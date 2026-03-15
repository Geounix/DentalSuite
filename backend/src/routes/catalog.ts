import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validators
const catalogSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    price: z.number().min(0, 'Price cannot be negative').default(0),
});

// GET all catalog procedures with optional search and pagination
router.get('/', async (req: any, res: any, next: any) => {
    try {
        const { search, limit, offset } = req.query;

        const where: any = { deletedAt: null };
        if (search) {
            where.name = { contains: String(search), mode: 'insensitive' };
        }

        const take = limit ? parseInt(String(limit)) : undefined;
        const skip = offset ? parseInt(String(offset)) : undefined;

        const [items, total] = await Promise.all([
            prisma.treatmentCatalog.findMany({
                where,
                take,
                skip,
                orderBy: { name: 'asc' }
            }),
            prisma.treatmentCatalog.count({ where })
        ]);

        res.json({ catalog: items, total });
    } catch (error) {
        next(error);
    }
});

// POST new procedure (requires auth)
router.post('/', requireRole(['admin', 'doctor', 'staff']), async (req: any, res: any, next: any) => {
    try {
        const data = catalogSchema.parse(req.body);
        const item = await prisma.treatmentCatalog.create({ data });
        res.status(201).json({ catalog: item });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        next(error);
    }
});

// PUT update procedure
router.put('/:id', requireRole(['admin', 'doctor', 'staff']), async (req: any, res: any, next: any) => {
    try {
        const { id } = req.params;
        const data = catalogSchema.partial().parse(req.body);

        const item = await prisma.treatmentCatalog.update({
            where: { id: parseInt(id) },
            data
        });

        res.json({ catalog: item });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        next(error);
    }
});

// DELETE (soft) procedure
router.delete('/:id', requireRole(['admin']), async (req: any, res: any, next: any) => {
    try {
        const { id } = req.params;
        await prisma.treatmentCatalog.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
