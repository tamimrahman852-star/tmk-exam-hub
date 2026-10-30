import { Router } from 'express';
import { getQuiz, publicView, evaluateQuiz } from '../utils/dailyQuiz.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Today's 5 questions (no answers, no explanations)
router.get('/', wrap(async (_req, res) => {
  let quiz;
  try { quiz = await getQuiz(); } catch (e) { console.error(e.message); }
  if (!quiz) return res.status(503).json({ error: "Today's quiz is not ready yet. Please try again in a few minutes." });
  res.json(publicView(quiz));
}));

// Instant evaluation with correct answers and explanations
router.post('/submit', wrap(async (req, res) => {
  const { date, answers } = req.body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return res.status(400).json({ error: 'Invalid quiz date' });
  const quiz = await getQuiz(date);
  if (!quiz) return res.status(404).json({ error: 'This quiz is no longer available. Load today\'s quiz.' });
  res.json(evaluateQuiz(quiz, answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {}));
}));

export default router;
