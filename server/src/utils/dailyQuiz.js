import { supabase } from '../supabase.js';
import { generate, textOf } from './gemini.js';

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
// Language of the AI-written questions. Bangla by default; set QUIZ_LANGUAGE=en on the server for English.
const LANG = String(process.env.QUIZ_LANGUAGE || 'bn').toLowerCase() === 'en' ? 'en' : 'bn';
const LETTERS = ['A', 'B', 'C', 'D'];
const TTL_FALLBACK = 30 * 60 * 1000; // retry AI after 30 min if today's quiz came from the question bank

const memory = new Map();   // date -> { quiz, at }
const inflight = new Map(); // date -> Promise (so 100 visitors trigger ONE generation)

export const dhakaDate = (t = Date.now()) => new Date(t + 6 * 3600 * 1000).toISOString().slice(0, 10);

// ---------- helpers ----------
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const clean = (v) => String(v ?? '').trim();

function valid(q) {
  const opts = [q.option_a, q.option_b, q.option_c, q.option_d].map(clean);
  return clean(q.question_text).length >= 12 && opts.every(Boolean) && new Set(opts).size === 4 && LETTERS.includes(q.correct_option);
}

// ---------- storage ----------
let dbWarned = false;
const warnDb = (e) => { if (!dbWarned) { console.warn('daily_quizzes table unavailable, using memory only:', e?.message); dbWarned = true; } };

async function loadFromDb(date) {
  const { data, error } = await supabase.from('daily_quizzes').select('quiz_date,source,questions').eq('quiz_date', date).maybeSingle();
  if (error) { warnDb(error); return null; }
  return data ? { date: data.quiz_date, source: data.source, lang: data.questions?.[0]?.lang || 'en', questions: data.questions } : null;
}
async function saveToDb(quiz) {
  const { error } = await supabase.from('daily_quizzes')
    .upsert({ quiz_date: quiz.date, source: quiz.source, questions: quiz.questions }, { onConflict: 'quiz_date' });
  if (error) warnDb(error);
}
async function recentStems() {
  const { data, error } = await supabase.from('daily_quizzes').select('questions').order('quiz_date', { ascending: false }).limit(3);
  if (error || !data) return [];
  return data.flatMap((d) => (d.questions || []).map((q) => clean(q.question_text).slice(0, 90)));
}

// ---------- question bank (existing exam questions) ----------
async function fromBank(date, count) {
  const { data, error } = await supabase.from('questions')
    .select('question_text,option_a,option_b,option_c,option_d,correct_option,explanation,ai_explanation').limit(400);
  if (error || !data?.length) return [];
  return shuffle(data.filter(valid), seeded(`bank-${date}`)).slice(0, count).map((q) => ({
    subject: 'Practice', question_text: clean(q.question_text),
    option_a: clean(q.option_a), option_b: clean(q.option_b), option_c: clean(q.option_c), option_d: clean(q.option_d),
    correct_option: q.correct_option, explanation: clean(q.explanation || q.ai_explanation), origin: 'bank',
  }));
}

// ---------- AI generation with a second "solve it independently" check ----------
const genSchema = {
  type: 'OBJECT',
  properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
    subject: { type: 'STRING', enum: SUBJECTS },
    question_text: { type: 'STRING' },
    option_a: { type: 'STRING' }, option_b: { type: 'STRING' }, option_c: { type: 'STRING' }, option_d: { type: 'STRING' },
    correct_option: { type: 'STRING', enum: LETTERS },
    explanation: { type: 'STRING' },
  }, required: ['subject', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation'] } } },
  required: ['questions'],
};
const verifySchema = {
  type: 'OBJECT',
  properties: { answers: { type: 'ARRAY', items: { type: 'OBJECT', properties: { index: { type: 'INTEGER' }, answer: { type: 'STRING', enum: LETTERS } }, required: ['index', 'answer'] } } },
  required: ['answers'],
};

async function aiCandidates(date) {
  const recent = await recentStems();
  const out = await generate({
    contents: [{ parts: [{ text: `You are an expert admission-test question writer for Bangladesh university and medical admission tests (Dhaka University, BUET, MBBS).
Write 8 multiple-choice questions at admission-test standard (HSC level and slightly above): 2 Physics, 2 Chemistry, 2 Mathematics, 2 Biology.
Rules:
- Exactly 4 options and exactly ONE correct answer. Distractors must be plausible.
- Use well-established facts and standard textbook methods only. No ambiguous, opinion-based or diagram-based questions.
- Numbers must be simple enough to solve by hand in under a minute.
${LANG === 'bn'
  ? `- Write the question, the options (when they are words) and the explanation in clear Bangla (বাংলা), in the style of HSC Bangla-medium textbooks and Bangladeshi admission-test papers. Keep formulas, symbols, units, chemical formulas and numbers in standard notation with English digits (H₂O, x², √, π, 10⁻³, m/s²). A well-known English technical term may be added in brackets when it helps.`
  : '- Write everything in clear English.'}
- Write formulas with Unicode (H₂O, x², √, π, Pb²⁺, 10⁻³).
- Spread the correct answers across A, B, C and D.
- explanation: 2 to 4 short sentences showing why the answer is correct.
- Today's date is ${date}. Choose fresh topics.${recent.length ? `\n- Do not repeat these recent questions:\n${recent.map((s) => `  * ${s}`).join('\n')}` : ''}
Return JSON only.` }] }],
    generationConfig: { temperature: 0.8, responseMimeType: 'application/json', responseSchema: genSchema },
  });
  if (!out.ok) return [];
  try { return (JSON.parse(textOf(out.data)).questions || []).filter(valid); } catch { return []; }
}

async function aiVerify(cands) {
  const listing = cands.map((q, i) => `#${i}\n${q.question_text}\nA) ${q.option_a}\nB) ${q.option_b}\nC) ${q.option_c}\nD) ${q.option_d}`).join('\n\n');
  const out = await generate({
    contents: [{ parts: [{ text: `Solve each multiple-choice question below independently and carefully. For every question give the letter of the single best answer.\n\n${listing}\n\nReturn JSON only.` }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: verifySchema },
  });
  if (!out.ok) return null;
  try {
    const map = new Map(JSON.parse(textOf(out.data)).answers.map((a) => [a.index, a.answer]));
    return map;
  } catch { return null; }
}

// one question per subject first, then fill, rotating which subject gets the extra question by day
function pickFive(verified, date) {
  const rot = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000) % SUBJECTS.length;
  const order = [...SUBJECTS.slice(rot), ...SUBJECTS.slice(0, rot)];
  const bySubject = Object.fromEntries(SUBJECTS.map((s) => [s, verified.filter((q) => q.subject === s)]));
  const picked = [];
  for (const s of SUBJECTS) if (bySubject[s].length) picked.push(bySubject[s].shift());
  for (const s of order) { if (picked.length >= 5) break; if (bySubject[s].length) picked.push(bySubject[s].shift()); }
  return picked.sort((a, b) => SUBJECTS.indexOf(a.subject) - SUBJECTS.indexOf(b.subject));
}

async function buildQuiz(date) {
  let questions = [];
  let source = 'bank';

  if (process.env.GEMINI_API_KEY) {
    try {
      const cands = await aiCandidates(date);
      const answers = cands.length ? await aiVerify(cands) : null;
      const agreed = answers ? cands.filter((q, i) => answers.get(i) === q.correct_option) : [];
      if (agreed.length >= 3) {
        questions = pickFive(agreed, date).map((q) => ({
          subject: q.subject, question_text: clean(q.question_text),
          option_a: clean(q.option_a), option_b: clean(q.option_b), option_c: clean(q.option_c), option_d: clean(q.option_d),
          correct_option: q.correct_option, explanation: clean(q.explanation), origin: 'ai',
        }));
        source = 'ai';
      }
    } catch (e) { console.error('Daily quiz AI failed:', e.message); }
  }
  if (questions.length < 5) questions = [...questions, ...(await fromBank(date, 5 - questions.length))];
  if (!questions.length) throw new Error('No questions available');

  return { date, source, lang: LANG, questions: questions.map((q, i) => ({ id: `${date}-${i + 1}`, lang: LANG, ...q })) };
}

// ---------- public API ----------
// A cached quiz is "fresh" if it is an AI quiz in the current language, or any quiz less than 30 minutes old.
const fresh = (e) => e && ((e.quiz.source === 'ai' && e.quiz.lang === LANG) || Date.now() - e.at < TTL_FALLBACK);

export async function getQuiz(date = dhakaDate()) {
  const today = dhakaDate();
  const hit = memory.get(date);
  if (hit && (date !== today || fresh(hit))) return hit.quiz;       // past days: serve whatever we have

  const stored = await loadFromDb(date);
  if (stored && (date !== today || stored.lang === LANG)) { memory.set(date, { quiz: stored, at: Date.now() }); return stored; }
  if (date !== today) return hit?.quiz || null;                     // past days are never generated

  // today: first visitor of the day, or the quiz language was switched
  if (inflight.has(date)) return inflight.get(date);
  const p = (async () => {
    try {
      let quiz = await buildQuiz(date);
      if (quiz.source !== 'ai' && stored) quiz = stored;            // AI is down: keep the quiz students already have
      memory.set(date, { quiz, at: Date.now() });
      if (quiz.source === 'ai' && quiz.lang === LANG) await saveToDb(quiz);
      return quiz;
    } finally { inflight.delete(date); }
  })();
  inflight.set(date, p);
  return p;
}

export const publicView = (quiz) => ({
  date: quiz.date, source: quiz.source, lang: quiz.lang || 'en',
  questions: quiz.questions.map(({ id, subject, question_text, option_a, option_b, option_c, option_d }) =>
    ({ id, subject, question_text, option_a, option_b, option_c, option_d })),
});

export function evaluateQuiz(quiz, answers = {}) {
  let correct = 0, wrong = 0, unanswered = 0;
  const breakdown = quiz.questions.map((q) => {
    const chosen = LETTERS.includes(answers?.[q.id]) ? answers[q.id] : null;
    let status = 'unanswered';
    if (!chosen) unanswered++;
    else if (chosen === q.correct_option) { status = 'correct'; correct++; } else { status = 'wrong'; wrong++; }
    return {
      id: q.id, subject: q.subject, question_text: q.question_text,
      options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
      chosen, correct_option: q.correct_option, explanation: q.explanation || null, status,
    };
  });
  return { date: quiz.date, source: quiz.source, lang: quiz.lang || 'en', score: correct, total: quiz.questions.length, correct, wrong, unanswered, breakdown };
}
