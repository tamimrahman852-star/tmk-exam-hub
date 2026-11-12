import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import extractRoutes from './routes/extract.js';
import dailyRoutes from './routes/daily.js';
import { feedbackPublic, feedbackAdmin } from './routes/feedback.js';
import { feedbackKeyProblem } from './utils/feedbackAuth.js';

const app = express();
const origins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins?.length ? origins : true }));
app.set('trust proxy', 1);
app.use('/api/extract', express.json({ limit: '8mb' }), extractRoutes);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/exams', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/daily-quiz', dailyRoutes);
app.use('/api/feedback', feedbackPublic);              // anyone can send
app.use('/api/feedback-admin', feedbackAdmin);        // only the Feedback Admin Key can read

app.use((err, _req, res, _next) => {
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;   // e.g. malformed JSON is the caller's fault
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server' : 'Invalid request' });
});

const keyProblem = feedbackKeyProblem();
if (keyProblem) console.warn(`Feedback panel is disabled: ${keyProblem}. Visitors can still send feedback.`);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`TMK Exam Hub API running on :${port}`));
