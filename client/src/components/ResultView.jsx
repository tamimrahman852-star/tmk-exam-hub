import { useState } from 'react';
import { api } from '../api.js';
import { mmss, num } from '../utils/format.js';

function ScoreRing({ score, total }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (score / total) * 100)) : 0;
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-3xl font-extrabold">{num(score)}</span>
        <span className="text-xs opacity-80">out of {num(total)}</span>
      </div>
    </div>
  );
}

function Explanation({ slug, attemptId, q }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ text: q.explanation || '', source: q.explanation ? 'creator' : '', loading: false, error: '' });

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || state.text || state.loading) return;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const r = await api(`/api/exams/${slug}/questions/${q.id}/explain`, { method: 'POST', body: { attemptId } });
      setState({ text: r.text, source: r.source, loading: false, error: '' });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  };

  return (
    <div className="mt-3">
      <button onClick={toggle} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
        {open ? 'Hide explanation ▲' : '💡 Show explanation ▼'}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm leading-relaxed">
          {state.loading && <p className="animate-pulse text-slate-500">AI is writing an explanation…</p>}
          {state.error && <p className="text-red-600">{state.error}</p>}
          {state.text && (
            <>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
                {state.source === 'ai' ? '🤖 AI explanation' : '📘 Explanation'}
              </p>
              <p className="whitespace-pre-line">{state.text}</p>
              {state.source === 'ai' && <p className="mt-2 text-xs text-slate-400">AI-generated, so it can make mistakes.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const tone = {
  correct: 'border-green-200 bg-green-50/50',
  wrong: 'border-red-200 bg-red-50/50',
  unanswered: 'border-slate-200 bg-white',
};
const badge = {
  correct: 'bg-green-100 text-green-700',
  wrong: 'bg-red-100 text-red-700',
  unanswered: 'bg-slate-100 text-slate-600',
};
const label = { correct: 'Correct', wrong: 'Wrong', unanswered: 'Skipped' };

export default function ResultView({ result, slug }) {
  const [filter, setFilter] = useState('all');
  const pct = result.totalMarks > 0 ? (result.score / result.totalMarks) * 100 : 0;
  const verdict = pct >= 80 ? 'Excellent work! 🎉' : pct >= 60 ? 'Good job! 👏' : pct >= 40 ? 'Keep practicing 💪' : 'Do not give up, review and retry 📚';
  const shown = result.breakdown.filter((q) => filter === 'all' || q.status === filter);

  const stats = [
    ['✅', result.correct, 'Correct', 'text-green-600'],
    ['❌', result.wrong, 'Wrong', 'text-red-600'],
    ['➖', result.unanswered, 'Skipped', 'text-slate-500'],
    ['⏱', result.timeTaken != null ? mmss(result.timeTaken) : '--', 'Time', 'text-indigo-600'],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-center text-white shadow-lg">
        <ScoreRing score={result.score} total={result.totalMarks} />
        <p className="text-lg font-bold">{verdict}</p>
        <p className="text-sm opacity-80">{Math.round(pct)}% score</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {stats.map(([icon, val, name, color]) => (
          <div key={name} className="card px-2 py-3 text-center">
            <p className="text-lg">{icon}</p>
            <p className={`text-lg font-extrabold ${color}`}>{val}</p>
            <p className="text-[11px] text-slate-500">{name}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[['all', `All (${result.total})`], ['correct', `Correct (${result.correct})`], ['wrong', `Wrong (${result.wrong})`], ['unanswered', `Skipped (${result.unanswered})`]].map(([k, t]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${filter === k ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}>{t}</button>
        ))}
      </div>

      {shown.map((q) => {
        const n = result.breakdown.indexOf(q) + 1;
        return (
          <div key={q.id} className={`rounded-2xl border p-4 ${tone[q.status]}`}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="font-medium leading-snug">{n}. {q.question_text}</p>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${badge[q.status]}`}>{label[q.status]}</span>
            </div>
            <ul className="space-y-1.5 text-sm">
              {Object.entries(q.options).map(([k, v]) => {
                const isCorrect = k === q.correct_option;
                const isWrongPick = k === q.chosen && !isCorrect;
                return (
                  <li key={k} className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 ${isCorrect ? 'bg-green-100 font-semibold text-green-800' : isWrongPick ? 'bg-red-100 font-semibold text-red-800' : ''}`}>
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
