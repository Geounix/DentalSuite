import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500;
  const message = err.message || 'Internal server error';

  // Log full stack in dev, just message in production
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${statusCode} – ${message}`);
    if (err.stack) console.error(err.stack);
  } else {
    console.error(`[ERROR] ${statusCode} – ${message}`);
  }

  // Prisma not found
  if ((err as any).code === 'P2025') {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  // Prisma unique constraint
  if ((err as any).code === 'P2002') {
    res.status(409).json({ error: 'Resource already exists (unique constraint)' });
    return;
  }

  res.status(statusCode).json({
    error: statusCode < 500 ? message : 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 ? { detail: message } : {}),
  });
};

/** Wrap an async route handler to forward errors to the global errorHandler. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
