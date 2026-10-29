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

  // Convert buffer to generative part format
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
