import { Router } from 'express';
import { makeGuard } from '../middleware/guard.js';

const router = Router();

// GEMINI_MODEL can be a comma-separated list. Each model is tried (with one retry on overload)
// before falling back to the next one.
const MODELS = (process.env.GEMINI_MODEL || 'gemini-3.5-flash,gemini-3.6-flash,gemini-3.1-flash-lite')
  .split(',').map((m) => m.trim()).filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(body) {
  let last = { ok: false, status: 500 };
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) return { ok: true, data };
      last = { ok: false, status: r.status };
      console.error(`Gemini error [${model}] ${r.status}`, JSON.stringify(data).slice(0, 300));
      if ([400, 401, 403].includes(r.status)) return last; // key/request problem: other models won't help
      if (r.status === 404) break;                           // this model name is unavailable: next model
      await sleep(1500);
    }
  }
  return last;
}

const PROMPT = `This is a photo of a question paper / question bank page. It may be in Bangla, English or mixed.
Extract EVERY multiple-choice question visible on the page, in order.

Rules:
- Keep the original language and wording exactly. Do not translate, shorten or fix the question.
- Write chemical formulas, powers and fractions with Unicode characters (H₂O, Pb²⁺, 10¹⁵, SO₄, 1/4).
- Options are labelled (a) (b) (c) (d). Put them in option_a..option_d WITHOUT the label.
- Remove the question number from question_text.
- If the page has an answer key (for example a table like "21. d  22. c"), use it to set correct_option by matching the question number. If there is no key entry for a question, set correct_option to null. Never solve the question yourself.
- Ignore headers, footers, page numbers, ads, pen marks and circles around numbers.
- Skip a question if it does not have four readable options.
Return JSON only.`;

const schema = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question_text: { type: 'STRING' },
          option_a: { type: 'STRING' },
          option_b: { type: 'STRING' },
          option_c: { type: 'STRING' },
          option_d: { type: 'STRING' },
          correct_option: { type: 'STRING', enum: ['A', 'B', 'C', 'D'], nullable: true },
        },
        required: ['question_text', 'option_a', 'option_b', 'option_c', 'option_d'],
      },
    },
  },
  required: ['questions'],
};

router.post('/', makeGuard(Number(process.env.EXTRACT_LIMIT) || 10), async (req, res, next) => {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body || {};
    if (!image || typeof image !== 'string') return res.status(400).json({ error: 'No image received' });
    if (image.length > 7_000_000) return res.status(413).json({ error: 'Image is too large' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'AI extraction is not configured on the server' });

    const out = await generate({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: image } }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema },
    });
    if (!out.ok) {
      const busy = [429, 500, 503, 504].includes(out.status);
      return res.status(busy ? 503 : 502).json({
        error: busy
          ? 'The AI is very busy right now. Please try again in a minute.'
          : 'The AI could not process this image. Check the server GEMINI_API_KEY / GEMINI_MODEL.',
      });
    }
    const data = out.data;

    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    let parsed;
    try { parsed = JSON.parse(text); } catch { return res.status(502).json({ error: 'Could not read the AI response. Try a clearer photo.' }); }

    const questions = (parsed.questions || [])
      .filter((q) => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d)
      .map((q) => ({
        question_text: q.question_text.trim(),
        option_a: q.option_a.trim(), option_b: q.option_b.trim(),
        option_c: q.option_c.trim(), option_d: q.option_d.trim(),
        correct_option: ['A', 'B', 'C', 'D'].includes(q.correct_option) ? q.correct_option : '',
      }));

    if (!questions.length) return res.status(422).json({ error: 'No questions found in this image.' });
    res.json({ questions });
  } catch (e) { next(e); }
});

export default router;
