import { Router } from 'express';
import { supabase } from '../supabase.js';
import { evaluate } from '../utils/score.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// List published exams
router.get('/', wrap(async (_req, res) => {
  const { data, error } = await supabase
    .from('exams')
    .select('id,slug,title,description,duration_minutes,created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

// Get an exam for taking. Correct answers are NEVER sent here.
router.get('/:slug', wrap(async (req, res) => {
  const { data: exam, error } = await supabase
    .from('exams')
    .select('id,slug,title,description,duration_minutes')
    .eq('slug', req.params.slug).eq('is_published', true).maybeSingle();
  if (error) throw error;
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
  const { studentName = '', answers = {} } = req.body || {};
  const { data: exam, error } = await supabase
    .from('exams').select('id').eq('slug', req.params.slug).eq('is_published', true).maybeSingle();
  if (error) throw error;
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  const { data: questions, error: qErr } = await supabase
    .from('questions').select('*').eq('exam_id', exam.id).order('position');
  if (qErr) throw qErr;

  const result = evaluate(questions, answers);

  const { error: aErr } = await supabase.from('attempts').insert({
    exam_id: exam.id,
    student_name: String(studentName).slice(0, 80),
    score: result.score,
    total_marks: result.totalMarks,
    correct: result.correct,
    wrong: result.wrong,
    unanswered: result.unanswered,
    answers,
  });
  if (aErr) throw aErr;

  res.json(result);
}));

export default router;
