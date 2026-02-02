import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth'; // ✅ Importar AuthRequest
import { createUserSchema, updateUserSchema } from './schemas/user';
import { hash } from '../utils/hash';

const router = Router();
router.use(requireAuth as any); // Cast temporal para el middleware

// ✅ Todas las funciones usan AuthRequest en lugar de Request
const isAdmin = (req: AuthRequest) => req.user && req.user.role === 'admin';

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({ 
      where: { status: { not: 'deleted' } }, 
      orderBy: { createdAt: 'desc' } 
    });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ 
      where: { id }, 
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true } 
    });
    if (!user || user.status === 'deleted') return res.status(404).json({ error: 'Not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    // ✅ Ahora req.user existe y TypeScript lo reconoce
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.errors);
      return res.status(400).json({ error: parsed.error.errors });
    }

    const data = parsed.data;
    const passwordHash = data.password 
      ? await hash(data.password) 
      : await hash(Math.random().toString(36).slice(-8));

    const newUser = await prisma.user.create({ 
      data: { 
        name: data.name, 
        email: data.email, 
        role: data.role || 'staff', 
        password: passwordHash 
      } 
    });
    
    res.status(201).json({ 
      user: { 
        id: newUser.id, 
        name: newUser.name, 
        email: newUser.email, 
        role: newUser.role 
      } 
    });
  } catch (err: any) {
    console.error('CREATE USER ERROR:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    
    const data = parsed.data;
    
    // ✅ Validación correcta con req.user tipado
    if (!req.user || (req.user.role !== 'admin' && req.user.id !== id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const update: any = { name: data.name, role: data.role, status: data.status };
    if (data.password) update.password = await hash(data.password);
    
    const updatedUser = await prisma.user.update({ where: { id }, data: update });
    res.json({ 
      user: { 
        id: updatedUser.id, 
        name: updatedUser.name, 
        email: updatedUser.email, 
        role: updatedUser.role 
      } 
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    // ✅ Validación correcta
    if (!req.user || (req.user.role !== 'admin' && req.user.id !== id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const temp = Math.random().toString(36).slice(-8);
    const passwordHash = await hash(temp);
    await prisma.user.update({ where: { id }, data: { password: passwordHash } });
    
    res.json({ tempPassword: temp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    // ✅ Validación correcta
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const id = Number(req.params.id);
    await prisma.user.update({ where: { id }, data: { status: 'deleted' } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;