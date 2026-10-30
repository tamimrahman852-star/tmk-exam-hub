import { Router } from 'express';
import { supabase } from '../supabase.js';
import { evaluate } from '../utils/score.js';
import { generate, textOf } from '../utils/gemini.js';
import { createLimiter } from '../middleware/guard.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const explainLimit = createLimiter(Number(process.env.EXPLAIN_LIMIT) || 30);

async function getExam(slug, cols) {
  const { data, error } = await supabase.from('exams').select(cols)
    .eq('slug', slug).eq('is_published', true).maybeSingle();
  if (error) throw error;
  return data;
}

// Best attempt per student name, ranked by score (desc) then time (asc).
async function buildLeaderboard(examId, meId) {
  const { data, error } = await supabase.from('attempts')
    .select('id,student_name,score,total_marks,correct,wrong,unanswered,time_taken_seconds')
    .eq('exam_id', examId)
    .order('score', { ascending: false })
    .order('time_taken_seconds', { ascending: true })
    .limit(300);
  if (error) throw error;

  const seen = new Set();
  const rows = [];
  let myRank = null;
  for (const a of data) {
    const key = (a.student_name || '').trim().toLowerCase();
    const isMe = !!meId && a.id === meId;
    if (seen.has(key) && !isMe) continue;
    seen.add(key);
    rows.push({
      rank: rows.length + 1,
      name: a.student_name || 'Anonymous',
      score: Number(a.score), totalMarks: Number(a.total_marks),
      correct: a.correct, wrong: a.wrong, skipped: a.unanswered ?? 0,
      timeTaken: a.time_taken_seconds,
      isMe,
    });
    if (isMe) myRank = rows.length;
  }
  return { rows: rows.slice(0, 50), myRank, participants: rows.length, topScore: rows[0]?.score ?? 0 };
}

// List published exams
router.get('/', wrap(async (_req, res) => {
  const { data, error } = await supabase
    .from('exams')
    .select('id,slug,title,description,duration_minutes,created_at,questions(count)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data.map(({ questions, ...e }) => ({ ...e, question_count: questions?.[0]?.count ?? null })));
}));

// Leaderboard
router.get('/:slug/leaderboard', wrap(async (req, res) => {
  const exam = await getExam(req.params.slug, 'id');
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  const me = UUID.test(String(req.query.me || '')) ? String(req.query.me) : null;
  res.json(await buildLeaderboard(exam.id, me));
}));

// Get an exam for taking. Correct answers and explanations are NEVER sent here.
router.get('/:slug', wrap(async (req, res) => {
  const exam = await getExam(req.params.slug, 'id,slug,title,description,duration_minutes');
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id,position,question_text,option_a,option_b,option_c,option_d,marks,negative_marks')
    .eq('exam_id', exam.id).order('position');
  if (qErr) throw qErr;
  res.json({ ...exam, questions });
}));

// Submit answers -> evaluated on the server
router.post('/:slug/submit', wrap(async (req, res) => {
  const { studentName = '', answers = {}, timeTaken } = req.body || {};
  const name = String(studentName).trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: 'Please enter your name' });

  const exam = await getExam(req.params.slug, 'id,duration_minutes');
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  const { data: questions, error: qErr } = await supabase
    .from('questions').select('*').eq('exam_id', exam.id).order('position');
  if (qErr) throw qErr;

  const safeAnswers = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  const result = evaluate(questions, safeAnswers);

  const maxT = exam.duration_minutes * 60 + 30;
  const t = Number.isFinite(Number(timeTaken)) ? Math.min(maxT, Math.max(0, Math.round(Number(timeTaken)))) : null;

  const { data: attempt, error: aErr } = await supabase.from('attempts').insert({
    exam_id: exam.id,
    student_name: name,
    score: result.score,
    total_marks: result.totalMarks,
    correct: result.correct,
    wrong: result.wrong,
    unanswered: result.unanswered,
    time_taken_seconds: t,
    answers: safeAnswers,
  }).select('id').single();
  if (aErr) throw aErr;

  res.json({ ...result, attemptId: attempt.id, timeTaken: t });
}));

// Explanation for one question. Only available after the student has submitted this exam.
router.post('/:slug/questions/:qid/explain', wrap(async (req, res) => {
  const { attemptId } = req.body || {};
  if (!UUID.test(String(attemptId || ''))) return res.status(403).json({ error: 'Submit the exam first to see explanations' });

  const exam = await getExam(req.params.slug, 'id');
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  const { data: attempt, error: aErr } = await supabase.from('attempts')
    .select('id').eq('id', attemptId).eq('exam_id', exam.id).maybeSingle();
  if (aErr) throw aErr;
  if (!attempt) return res.status(403).json({ error: 'Submit the exam first to see explanations' });

  if (!UUID.test(req.params.qid)) return res.status(404).json({ error: 'Question not found' });
  const { data: q, error: qErr } = await supabase.from('questions')
    .select('*').eq('id', req.params.qid).eq('exam_id', exam.id).maybeSingle();
  if (qErr) throw qErr;
  if (!q) return res.status(404).json({ error: 'Question not found' });

  if (q.explanation) return res.json({ source: 'creator', text: q.explanation });
  if (q.ai_explanation) return res.json({ source: 'ai', text: q.ai_explanation });

  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'AI explanations are not available right now' });
  if (!explainLimit.allow(req.ip)) return res.status(429).json({ error: 'Too many explanation requests. Please try again later.' });

  const correctText = q[`option_${q.correct_option.toLowerCase()}`];
  const prompt = `You are a friendly, accurate teacher. Explain in 3 to 5 short sentences why option ${q.correct_option} is the correct answer to this multiple-choice question, and briefly why the other options are wrong if that helps.
Reply in the same language as the question. Plain text only (no markdown, no headings). Write formulas with Unicode (H₂O, Pb²⁺).
If you believe the marked correct answer is actually wrong, say so politely in the first sentence.

Question: ${q.question_text}
A) ${q.option_a}
B) ${q.option_b}
C) ${q.option_c}
D) ${q.option_d}
Marked correct answer: ${q.correct_option}) ${correctText}`;

  const out = await generate({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } });
  if (!out.ok) return res.status(503).json({ error: 'The AI is busy right now. Please try again in a minute.' });
  const text = textOf(out.data).trim();
  if (!text) return res.status(502).json({ error: 'The AI returned an empty answer. Please try again.' });

  const { error: uErr } = await supabase.from('questions').update({ ai_explanation: text }).eq('id', q.id);
  if (uErr) console.error('Could not cache AI explanation', uErr.message);
  res.json({ source: 'ai', text });
}));

export default router;
