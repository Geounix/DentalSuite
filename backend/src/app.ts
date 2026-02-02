import express from 'express';
import cors from 'cors';
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
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

// ensure uploads folder exists and serve it
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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
