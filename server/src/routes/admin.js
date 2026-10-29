import { Router } from 'express';
import { supabase } from '../supabase.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { makeSlug } from '../utils/slug.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
router.use(adminAuth);

router.get('/check', (_req, res) => res.json({ ok: true }));

router.post('/exams', wrap(async (req, res) => {
  const { title, description = '', duration_minutes = 30, questions } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!Array.isArray(questions) || !questions.length)
    return res.status(400).json({ error: 'Add at least one question' });

  const rows = [];
  for (const [i, q] of questions.entries()) {
    const correct = String(q.correct_option || '').toUpperCase();
    const complete = q.question_text?.trim() &&
      ['option_a', 'option_b', 'option_c', 'option_d'].every((k) => q[k]?.trim());
    if (!complete || !['A', 'B', 'C', 'D'].includes(correct))
      return res.status(400).json({ error: `Question ${i + 1} is incomplete` });
    rows.push({
      position: i,
      question_text: q.question_text.trim(),
      option_a: q.option_a.trim(), option_b: q.option_b.trim(),
      option_c: q.option_c.trim(), option_d: q.option_d.trim(),
      correct_option: correct,
      marks: Math.abs(Number(q.marks) || 1),
      negative_marks: Math.abs(Number(q.negative_marks) || 0), // "-0.25" is stored as 0.25
    });
  }

  const slug = makeSlug(title);
  const { data: exam, error } = await supabase.from('exams')
    .insert({ slug, title: title.trim(), description, duration_minutes: Math.max(1, Number(duration_minutes) || 30) })
    .select('id,slug').single();
  if (error) throw error;

  const { error: qErr } = await supabase.from('questions').insert(rows.map((r) => ({ ...r, exam_id: exam.id })));
  if (qErr) {
    await supabase.from('exams').delete().eq('id', exam.id); // rollback
    throw qErr;
  }
  res.status(201).json({ slug: exam.slug });
}));

router.delete('/exams/:id', wrap(async (req, res) => {
  const { error } = await supabase.from('exams').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ ok: true });
}));

export default router;
