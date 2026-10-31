import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDailyQuiz, submitDailyQuiz, loadCompleted, saveCompleted } from '../utils/dailyQuiz.js';
import { recordMistakes } from '../utils/mistakes.js';
import { recordActivity } from '../utils/activity.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const SUBJECT = {
  Physics: 'bg-sky-50 text-sky-700 ring-sky-200',
  Chemistry: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Mathematics: 'bg-violet-50 text-violet-700 ring-violet-200',
  Biology: 'bg-rose-50 text-rose-700 ring-rose-200',
  Practice: 'bg-slate-100 text-slate-600 ring-slate-200',
};
const BN = { Physics: 'পদার্থবিজ্ঞান', Chemistry: 'রসায়ন', Mathematics: 'গণিত', Biology: 'জীববিজ্ঞান', Practice: 'অনুশীলন' };
const subjectLabel = (s, lang) => (lang === 'bn' ? BN[s] || s : s);
const chip = (s) => `inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${SUBJECT[s] || SUBJECT.Practice}`;

// time until the next quiz (midnight in Dhaka)
const untilReset = () => {
  const ms = 86400000 - ((Date.now() + 6 * 3600000) % 86400000);
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

function Review({ result }) {
  const bn = result.lang === 'bn';
  return (
    <div className="space-y-3">
      {result.breakdown.map((q, n) => (
        <div key={q.id} className={`rounded-2xl border p-4 ${q.status === 'correct' ? 'border-emerald-200 bg-emerald-50/40' : q.status === 'wrong' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={chip(q.subject)}>{subjectLabel(q.subject, result.lang)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${q.status === 'correct' ? 'bg-emerald-100 text-emerald-700' : q.status === 'wrong' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
              {q.status === 'correct' ? '✓ Correct' : q.status === 'wrong' ? '✗ Wrong' : '➖ Skipped'}
            </span>
          </div>
          <p lang={bn ? 'bn' : undefined} className={`font-medium text-slate-900 ${bn ? 'leading-relaxed' : 'leading-snug'}`}><span className="text-indigo-600">{n + 1}.</span> {q.question_text}</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {Object.entries(q.options).map(([k, v]) => {
              const ok = k === q.correct_option, bad = k === q.chosen && !ok;
              return (
                <li key={k} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${ok ? 'bg-emerald-100 font-semibold text-emerald-800' : bad ? 'bg-rose-100 font-semibold text-rose-800' : 'bg-white text-slate-700 ring-1 ring-slate-100'}`}>
                  <span className="font-bold">{k}.</span><span className="flex-1">{v}</span>
                  {ok && <span className="text-xs">✓ Correct answer</span>}
                  {bad && <span className="text-xs">✗ Your answer</span>}
                </li>
              );
            })}
          </ul>
          {q.explanation && <p lang={bn ? 'bn' : undefined} className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm leading-relaxed text-slate-700">💡 {q.explanation}</p>}
        </div>
      ))}
    </div>
  );
}

export default function DailyQuizWidget() {
  const [state, setState] = useState(() => (loadCompleted() ? 'done' : 'loading')); // loading | ready | playing | done | error
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(() => loadCompleted());
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [resetIn, setResetIn] = useState(untilReset);

  const load = useCallback(() => {
    setState('loading'); setError('');
    fetchDailyQuiz().then((q) => { setQuiz(q); setState('ready'); }).catch((e) => { setError(e.message); setState('error'); });
  }, []);

  useEffect(() => { if (!loadCompleted()) load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setResetIn(untilReset()), 30000); return () => clearInterval(t); }, []);

  const q = quiz?.questions[i];
  const n = quiz?.questions.length || 5;
  const last = i === n - 1;

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const r = await submitDailyQuiz(quiz.date, answers);
      recordMistakes(r.breakdown, { origin: 'Daily Quiz', source: 'daily' });   // wrong answers go to the Mistake Book
      recordActivity({ type: 'quiz', questions: r.correct + r.wrong });         // counts for the study streak
      saveCompleted(quiz.date, r);
      setResult(r); setShowReview(true); setState('done');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const tone = result && (result.score >= 4 ? { ring: 'from-emerald-500 to-green-500', text: 'text-emerald-600', msg: 'Excellent! You are admission ready 🎉' }
    : result.score >= 3 ? { ring: 'from-amber-400 to-orange-500', text: 'text-amber-600', msg: 'Good effort. Review the explanations 👏' }
    : { ring: 'from-rose-400 to-red-500', text: 'text-rose-600', msg: 'Keep going. Mistakes are how we learn 💪' });

  return (
    <section aria-label="Daily admission quiz" className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 via-white to-indigo-50/80 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-base">🎯</span>
          Daily Admission Quiz <span className="hidden text-slate-400 sm:inline">(AI Powered)</span>
        </h2>
        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
          {quiz?.source === 'bank' ? '📚 Question bank' : '✨ AI Powered'}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {state === 'loading' && (
          <div className="space-y-3" aria-busy="true">
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" /><div className="h-4 w-full animate-pulse rounded bg-slate-100" /><div className="h-10 w-40 animate-pulse rounded-xl bg-slate-100" />
            <p className="text-xs text-slate-400">Preparing today&apos;s questions… the first student of the day may wait up to 30 seconds.</p>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-3">
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error || 'Could not load the quiz.'}</p>
            <button className="btn" onClick={load}>Try again</button>
          </div>
        )}

        {state === 'ready' && (
          <div className="animate-fade-up">
            <p className="text-lg font-bold text-slate-900">5 fresh questions every day</p>
            <p className="mt-1 text-sm text-slate-500">{quiz.lang === 'bn' ? 'বাংলায় পদার্থবিজ্ঞান, রসায়ন, গণিত ও জীববিজ্ঞান, ভর্তি পরীক্ষার মানের প্রশ্ন। ' : 'Physics, Chemistry, Mathematics and Biology at admission-test level. '}Takes about 3 minutes, with instant score and explanations.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...new Set(quiz.questions.map((x) => x.subject))].map((s) => <span key={s} className={chip(s)}>{subjectLabel(s, quiz.lang)}</span>)}
            </div>
            <button className="btn mt-4 !px-6" onClick={() => { setI(0); setAnswers({}); setState('playing'); }}>Start today&apos;s quiz →</button>
          </div>
        )}

        {state === 'playing' && q && (
          <div key={q.id} className="animate-fade-up">
            <div className="mb-3 flex items-center gap-1.5" aria-label={`Question ${i + 1} of ${n}`}>
              {quiz.questions.map((x, k) => <span key={x.id} className={`h-1.5 flex-1 rounded-full transition-colors ${k < i || answers[x.id] ? 'bg-indigo-600' : k === i ? 'bg-indigo-300' : 'bg-slate-200'}`} />)}
            </div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Question {i + 1} of {n}</span>
              <span className={chip(q.subject)}>{subjectLabel(q.subject, quiz.lang)}</span>
            </div>
            <p lang={quiz.lang === 'bn' ? 'bn' : undefined} className={`font-medium text-slate-900 ${quiz.lang === 'bn' ? 'text-[17px] leading-relaxed' : 'leading-snug'}`}>{q.question_text}</p>
            <div className="mt-3 space-y-2">
              {LETTERS.map((k) => {
                const sel = answers[q.id] === k, locked = !!answers[q.id];
                return (
                  <label key={k} className={`flex items-start gap-3 rounded-xl border-2 px-3 py-3 transition duration-200 ${sel ? 'animate-pop border-indigo-600 bg-indigo-50' : locked ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50' : 'cursor-pointer border-slate-200 hover:border-indigo-300 hover:bg-slate-50 active:scale-[0.99]'}`}>
                    <input type="radio" name={q.id} className="sr-only" checked={sel} disabled={locked} onChange={() => setAnswers((a) => (a[q.id] ? a : { ...a, [q.id]: k }))} />
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${sel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{k}</span>
                    <span lang={quiz.lang === 'bn' ? 'bn' : undefined} className={`flex-1 pt-0.5 text-[15px] ${quiz.lang === 'bn' ? 'leading-relaxed' : 'leading-snug'}`}>{q[`option_${k.toLowerCase()}`]}</span>
                    {sel && <span title="Locked">🔒</span>}
                  </label>
                );
              })}
            </div>
            {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">🔒 Your first choice is final.</p>
              {last
                ? <button className="btn" disabled={!answers[q.id] || busy} onClick={submit}>{busy ? 'Checking…' : 'Submit & see score'}</button>
                : <button className="btn" disabled={!answers[q.id]} onClick={() => setI(i + 1)}>Next →</button>}
            </div>
          </div>
        )}

        {state === 'done' && result && (
          <div className="animate-fade-up space-y-4">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${tone.ring} p-1.5`}>
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                  <span className={`text-2xl font-black leading-none tabular-nums ${tone.text}`}>{result.score}/{result.total}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{tone.msg}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-sm font-semibold">
                  <span className="text-emerald-600">✅ {result.correct} correct</span>
                  <span className="text-rose-600">❌ {result.wrong} wrong</span>
                  <span className="text-slate-500">➖ {result.unanswered} skipped</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">Next quiz in {resetIn}</p>
              </div>
            </div>

            {result.wrong > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2.5 text-sm">
                <span className="text-rose-800">📕 {result.wrong} wrong question{result.wrong === 1 ? '' : 's'} saved to your Mistake Book.</span>
                <Link to="/mistakes" className="font-semibold text-rose-700 underline-offset-2 hover:underline">Review mistakes →</Link>
              </div>
            )}

            <button className="btn-ghost" onClick={() => setShowReview((v) => !v)} aria-expanded={showReview}>{showReview ? 'Hide answers ▲' : 'Show answers & explanations ▼'}</button>
            {showReview && <Review result={result} />}
            <p className="text-[11px] leading-snug text-slate-400">
              {result.source === 'bank' ? 'Questions are from the TMK question bank.' : 'Questions are AI-generated and double-checked by a second AI pass, but can still contain mistakes. Cross-check with your textbook.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
