import { Router } from 'express';
import prisma from '../prisma';
import { hash, compare } from '../utils/hash';
import { signJwt } from '../utils/jwt';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'staff' } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });
    const passwordHash = await hash(password);
    const user = await prisma.user.create({ data: { name, email, password: passwordHash, role } });
    const token = signJwt({ id: user.id, role: user.role, email: user.email });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    // prevent login if account is not active
    if (user.status !== 'active') return res.status(403).json({ error: 'Account not active' });
    const ok = await compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = signJwt({ id: user.id, role: user.role, email: user.email });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
