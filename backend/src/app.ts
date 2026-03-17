import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth';
import patientsRoutes from './routes/patients';
import appointmentsRoutes from './routes/appointments';
import paymentsRoutes from './routes/payments';
import proceduresRoutes from './routes/procedures';
import insurancesRoutes from './routes/insurances';
import documentsRoutes from './routes/documents';
import consentsRoutes from './routes/consents';
import reportsRoutes from './routes/reports';
import usersRoutes from './routes/users';
import catalogRoutes from './routes/catalog';
import medicalHistoryRoutes from './routes/medicalHistory';
import settingsRoutes from './routes/settings';
import { errorHandler } from './middleware/errorHandler';
import path from 'path';
import fs from 'fs';

const app = express();

// CORS – allow credentials so the HttpOnly cookie is sent cross-origin
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://localhost:4000',
  'http://127.0.0.1:5173'
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('geunix.com')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Ensure uploads folder exists and serve it
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Serve static frontend files (React Build)
const frontendDistPath = path.join(__dirname, '..', '..', 'dist');
app.use(express.static(frontendDistPath, {
  setHeaders: (res, path) => {
    if (path.includes('/assets/')) {
      // Cache assets with hashes for 1 year
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else {
      // Do not cache index.html or other root files
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/procedures', proceduresRoutes);
app.use('/api/insurances', insurancesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/consents', consentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/medical-history', medicalHistoryRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler – must be registered LAST
app.use(errorHandler);

// Catch-all route to serve the React app for any unhandled paths (Frontend routing)
app.get('*', (req, res) => {
  // If the request is for an asset (e.g., /assets/..., .js, .css, .png), return 404 instead of index.html
  if (req.path.startsWith('/assets/') || req.path.match(/\.[a-zA-Z0-9]+$/)) {
    return res.status(404).send('Asset not found');
  }
  // Never cache the index.html fallback
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

export default app;
