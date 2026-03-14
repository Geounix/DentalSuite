import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: { id: number; role: string; email: string };
}

/** Middleware: verify JWT from Authorization header or HttpOnly cookie. */
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Prefer cookie, fall back to Authorization header
  const cookieToken = (req as any).cookies?.token as string | undefined;
  const header = req.headers.authorization;
  const headerToken = header?.startsWith('Bearer ') ? header.slice(7) : header;
  const token = cookieToken || headerToken;

  if (!token) {
    res.status(401).json({ error: 'No authentication token provided' });
    return;
  }
  try {
    const payload = verifyJwt(token) as { id: number; role: string; email: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware factory: require the authenticated user to have one of the given roles.
 * Must be used AFTER requireAuth.
 */
export const requireRole = (roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    const userRole = String(req.user.role).toLowerCase();
    if (!roles.map(r => r.toLowerCase()).includes(userRole)) {
      res.status(403).json({ error: `Forbidden – required role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
