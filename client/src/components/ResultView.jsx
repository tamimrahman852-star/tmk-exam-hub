import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { mmss, num } from '../utils/format.js';

function useCountUp(target, ms = 1000) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min(1, (t - start) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function ScoreRing({ score, total }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (score / total) * 100)) : 0;
  const color = pct >= 70 ? '#4ade80' : pct >= 40 ? '#fbbf24' : '#f87171';
  const shown = useCountUp(score);
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t); }, []);
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="9" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={ready ? c * (1 - pct / 100) : c}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-4xl font-black tabular-nums">{num(shown)}</span>
        <span className="text-xs text-white/75">out of {num(total)}</span>
      </div>
    </div>
  );
}

// Explanation: creator's text (already in the result) or fetched from the database / AI on first click.
function Explanation({ slug, attemptId, q }) {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState({ text: q.explanation || '', source: q.explanation ? 'creator' : '', loading: false, error: '' });

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || st.text || st.loading) return;
    setSt((s) => ({ ...s, loading: true, error: '' }));
    try {
      const r = await api(`/api/exams/${slug}/questions/${q.id}/explain`, { method: 'POST', body: { attemptId } });
      setSt({ text: r.text, source: r.source, loading: false, error: '' });
    } catch (e) { setSt((s) => ({ ...s, loading: false, error: e.message })); }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/50">
      <button onClick={toggle} className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">
        <span>💡 Explanation</span>
        <span className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="border-t border-indigo-100 px-3.5 py-3 text-sm leading-relaxed">
            {st.loading && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-indigo-600">🤖 AI is writing an explanation…</p>
                <div className="h-3 w-full animate-pulse rounded bg-indigo-100" /><div className="h-3 w-4/5 animate-pulse rounded bg-indigo-100" /><div className="h-3 w-2/3 animate-pulse rounded bg-indigo-100" />
              </div>
            )}
            {st.error && <p className="text-red-600">{st.error}</p>}
            {st.text && (
              <>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-indigo-600">{st.source === 'ai' ? '🤖 AI explanation' : '📘 Explanation'}</p>
                <p className="whitespace-pre-line text-slate-700">{st.text}</p>
                {st.source === 'ai' && <p className="mt-2 text-xs text-slate-400">AI-generated, so it can make mistakes. Saved for the next student.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const border = { correct: 'border-l-green-500', wrong: 'border-l-red-500', unanswered: 'border-l-slate-300' };
const badge = { correct: 'bg-green-100 text-green-700', wrong: 'bg-red-100 text-red-700', unanswered: 'bg-slate-100 text-slate-600' };
const label = { correct: '✓ Correct', wrong: '✗ Wrong', unanswered: '➖ Skipped' };

export default function ResultView({ result, slug }) {
  const [filter, setFilter] = useState('all');
  const pct = result.totalMarks > 0 ? (result.score / result.totalMarks) * 100 : 0;
  const attempted = result.correct + result.wrong;
  const accuracy = attempted ? Math.round((result.correct / attempted) * 100) : 0;
  const verdict = pct >= 80 ? 'Excellent work! 🎉' : pct >= 60 ? 'Good job! 👏' : pct >= 40 ? 'Keep practicing 💪' : 'Review the answers and try again 📚';
  const shown = result.breakdown.filter((q) => filter === 'all' || q.status === filter);

  const stats = [
    ['✅', result.correct, 'Correct', 'text-green-600'],
    ['❌', result.wrong, 'Wrong', 'text-red-600'],
    ['➖', result.unanswered, 'Skipped', 'text-slate-500'],
    ['⏱', result.timeTaken != null ? mmss(result.timeTaken) : '--', 'Time', 'text-indigo-600'],
  ];

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-7 text-center text-white shadow-xl shadow-indigo-600/20">
        <ScoreRing score={result.score} total={result.totalMarks} />
        <p className="text-xl font-extrabold">{verdict}</p>
        <p className="text-sm text-white/80">{Math.round(Math.max(0, pct))}% score · {accuracy}% accuracy</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {stats.map(([icon, val, name, color], i) => (
          <div key={name} className="card animate-fade-up px-2 py-3 text-center" style={{ animationDelay: `${100 + i * 70}ms` }}>
            <p className="text-lg">{icon}</p>
            <p className={`text-lg font-extrabold tabular-nums ${color}`}>{val}</p>
            <p className="text-[11px] text-slate-500">{name}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[['all', `All (${result.total})`], ['correct', `Correct (${result.correct})`], ['wrong', `Wrong (${result.wrong})`], ['unanswered', `Skipped (${result.unanswered})`]].map(([k, t]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${filter === k ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{t}</button>
        ))}
      </div>

      {shown.map((q) => {
        const n = result.breakdown.indexOf(q) + 1;
        return (
          <div key={q.id} className={`card animate-fade-up border-l-4 p-4 ${border[q.status]}`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="font-medium leading-snug"><span className="text-indigo-600">{n}.</span> {q.question_text}</p>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${badge[q.status]}`}>{label[q.status]}</span>
            </div>
            <ul className="space-y-1.5 text-sm">
              {Object.entries(q.options).map(([k, v]) => {
                const isCorrect = k === q.correct_option;
                const isWrongPick = k === q.chosen && !isCorrect;
                return (
                  <li key={k} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${isCorrect ? 'bg-green-100 font-semibold text-green-800' : isWrongPick ? 'bg-red-100 font-semibold text-red-800' : 'bg-slate-50 text-slate-700'}`}>
                    <span className="font-bold">{k}.</span>
                    <span className="flex-1">{v}</span>
                    {isCorrect && <span className="text-xs">✓ Correct</span>}
                    {isWrongPick && <span className="text-xs">✗ Your answer</span>}
                    {isCorrect && k === q.chosen && <span className="text-xs">(yours)</span>}
                  </li>
                );
              })}
            </ul>
            <Explanation slug={slug} attemptId={result.attemptId} q={q} />
          </div>
        );
      })}
    </div>
  );
}
