import { Router } from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../supabase.js';
import { makeSlug } from '../utils/slug.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.get('/check', (_req, res) => res.json({ ok: true }));

// Image to MCQ Parse Route using Gemini
router.post('/parse-image-exam', upload.single('image'), wrap(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'কোনো ইমেজ আপলোড করা হয়নি!' });
  }

  const imagePart = {
    inlineData: {
      data: req.file.buffer.toString("base64"),
      mimeType: req.file.mimetype || "image/jpeg"
    },
  };

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are an expert academic question parser for admission test preparation. 
Analyze this question paper image carefully. Extract all the Multiple Choice Questions (MCQs), their options, and find the correct answer from the answer key (uttormala) provided at the bottom or anywhere in the image.
Return the result strictly as a valid JSON object with this exact format, with no extra markdown outside or text:
{
  "title": "Extracted Exam Title",
  "questions": [
    {
      "question_text": "Question text here",
      "option_a": "Option A text",
      "option_b": "Option B text",
      "option_c": "Option C text",
      "option_d": "Option D text",
      "correct_option": "A"
    }
  ]
}
Note: 'correct_option' must be strictly a single letter: "A", "B", "C", or "D".`;

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  let rawText = response.text().trim();

  if (rawText.startsWith("```json")) {
    rawText = rawText.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (rawText.startsWith("```")) {
    rawText = rawText.replace(/^```/, "").replace(/```$/, "").trim();
  }

  const parsedData = JSON.parse(rawText);
  res.json({ success: true, data: parsedData });
}));

// Exam Create & Save Route
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
      option_a: q.option_a.trim(), 
      option_b: q.option_b.trim(),
      option_c: q.option_c.trim(), 
      option_d: q.option_d.trim(),
      correct_option: correct,
      marks: Math.abs(Number(q.marks) || 1),
      negative_marks: Math.abs(Number(q.negative_marks) || 0),
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

// VERY IMPORTANT: Default export to prevent SyntaxError in index.js
export default router;
