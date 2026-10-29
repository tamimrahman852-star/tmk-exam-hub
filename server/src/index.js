import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import extractRoutes from './routes/extract.js';

const app = express();
const origins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins?.length ? origins : true }));
app.set('trust proxy', 1);
app.use('/api/extract', express.json({ limit: '8mb' }), extractRoutes);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/exams', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`TMK Exam Hub API running on :${port}`));
