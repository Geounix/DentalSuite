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
import { errorHandler } from './middleware/errorHandler';
import path from 'path';
import fs from 'fs';

const app = express();

// CORS – allow credentials so the HttpOnly cookie is sent cross-origin
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({
    origin: allowedOrigin,
    credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Ensure uploads folder exists and serve it
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler – must be registered LAST
app.use(errorHandler);

export default app;
