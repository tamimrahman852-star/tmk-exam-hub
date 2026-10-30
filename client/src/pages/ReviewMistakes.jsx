import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMistakes, removeMistake, restoreMistake, bumpMistake } from '../utils/mistakes.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const FILTERS = [['all', 'All'], ['exam', '📝 Exams'], ['daily', '🎯 Daily quiz']];
const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

// One question at a time. Answer correctly and it leaves the Mistake Book; get it wrong and it stays.
function Revision({ items, onExit, onRestart }) {
  const [snap] = useState(() => Object.fromEntries(items.map((m) => [m.id, m])));
  const [queue] = useState(() => shuffle(items.map((m) => m.id)));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [stats, setStats] = useState({ learned: 0, again: 0 });

  const m = snap[queue[idx]];
  const finished = idx >= queue.length;
  const correct = picked && picked === m?.correct_option;

  const pick = (k) => {
    if (picked) return;
    setPicked(k);
    if (k === m.correct_option) { removeMistake(m.id); setStats((s) => ({ ...s, learned: s.learned + 1 })); }
    else { bumpMistake(m.id, k); setStats((s) => ({ ...s, again: s.again + 1 })); }
  };
  const undo = () => { restoreMistake(m); setStats((s) => ({ ...s, learned: s.learned - 1 })); setPicked('undone'); };
  const next = () => { setIdx((i) => i + 1); setPicked(null); };

  if (finished) {
    return (
      <div className="card animate-fade-up space-y-4 p-6 text-center">
        <p className="text-4xl">{stats.again === 0 ? '🏆' : '💪'}</p>
        <h2 className="text-xl font-extrabold text-slate-900">Revision complete</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-3xl font-black text-emerald-600">{stats.learned}</p><p className="text-xs font-semibold text-emerald-700">learned and removed</p></div>
          <div className="rounded-2xl bg-rose-50 p-4"><p className="text-3xl font-black text-rose-600">{stats.again}</p><p className="text-xs font-semibold text-rose-700">still need practice</p></div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {stats.again > 0 && <button className="btn" onClick={onRestart}>Revise the rest</button>}
          <button className="btn-ghost" onClick={onExit}>Back to list</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Question {idx + 1} of {queue.length}</span>
          <button onClick={onExit} className="text-slate-400 hover:text-slate-700">✕ Exit</button>
        </div>
        <div className="mb-4 flex gap-1">{queue.map((id, k) => <span key={id} className={`h-1.5 flex-1 rounded-full ${k < idx ? 'bg-emerald-500' : k === idx ? 'bg-indigo-400' : 'bg-slate-200'}`} />)}</div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="chip">{m.origin}</span>
          {m.subject && <span className="chip">{m.subject}</span>}
          {(m.count || 1) > 1 && <span className="chip !bg-amber-50 !text-amber-700">Missed {m.count}×</span>}
        </div>
        <p className="font-medium leading-snug text-slate-900">{m.question_text}</p>

        <div className="mt-3 space-y-2">
          {LETTERS.filter((k) => m.options[k] !== undefined).map((k) => {
            const isCorrect = k === m.correct_option, isPick = k === picked;
            const style = !picked ? 'cursor-pointer border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              : isCorrect ? 'border-emerald-500 bg-emerald-50' : isPick ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-slate-50 opacity-60';
            return (
              <button key={k} onClick={() => pick(k)} disabled={!!picked} aria-label={`Option ${k}: ${m.options[k]}`}
                className={`flex w-full items-start gap-3 rounded-xl border-2 px-3 py-3 text-left transition duration-200 ${style}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${picked && isCorrect ? 'bg-emerald-500 text-white' : picked && isPick ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{k}</span>
                <span className="flex-1 pt-0.5 text-[15px] leading-snug">{m.options[k]}</span>
                {picked && isCorrect && <span className="text-sm">✓</span>}
                {picked && isPick && !isCorrect && <span className="text-sm">✗</span>}
              </button>
            );
          })}
        </div>

        {picked && picked !== 'undone' && (
          <div className={`animate-fade-up mt-4 rounded-xl p-3 text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`} role="status">
            {correct ? (
              <p>✓ Correct! Removed from your Mistake Book. <button onClick={undo} className="font-semibold underline">Undo</button></p>
            ) : (
              <p>✗ Not quite. The correct answer is <b>{m.correct_option}</b>. It stays in your Mistake Book.</p>
            )}
            {m.explanation && <p className="mt-2 rounded-lg bg-white/70 p-2.5 text-slate-700">💡 {m.explanation}</p>}
          </div>
        )}
        {picked === 'undone' && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600" role="status">Kept in your Mistake Book.</p>}
      </div>
      <button className="btn w-full" disabled={!picked} onClick={next}>{idx === queue.length - 1 ? 'Finish' : 'Next question →'}</button>
    </div>
  );
}

export default function ReviewMistakes() {
  const list = useMistakes();
  const [filter, setFilter] = useState('all');
  const [session, setSession] = useState(0);     // 0 = list view, >0 = revision session number
  const shown = list.filter((m) => filter === 'all' || m.source === filter);
  const count = (f) => (f === 'all' ? list.length : list.filter((m) => m.source === f).length);

  // The session keeps its own snapshot, so it must stay open even after the last mistake is answered correctly.
  if (session > 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Revision key={session} items={shown.length ? shown : list} onExit={() => setSession(0)} onRestart={() => setSession((s) => s + 1)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">📕 Mistake Book</h1>
          <p className="text-sm text-slate-500">Every question you got wrong, collected automatically. Revise only what you missed.</p>
        </div>
        {list.length > 0 && <button className="btn" onClick={() => setSession((s) => s + 1)}>▶ Start revision ({shown.length || list.length})</button>}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-4xl">🎉</p>
          <p className="mt-2 font-bold text-slate-800">Your Mistake Book is empty</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">Wrong answers from exams and the daily quiz will appear here by themselves.</p>
          <Link to="/" className="btn mt-4">Take an exam</Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([k, t]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${filter === k ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{t} ({count(k)})</button>
            ))}
          </div>
          {shown.length === 0 && <p className="card p-6 text-center text-sm text-slate-500">Nothing in this list.</p>}

          {shown.map((m) => (
            <article key={m.id} className="card animate-fade-up p-4">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="chip max-w-[60%] truncate">{m.origin}</span>
                {m.subject && <span className="chip">{m.subject}</span>}
                <span className={`chip ${(m.count || 1) > 1 ? '!bg-amber-50 !text-amber-700' : ''}`}>Missed {m.count || 1}×</span>
              </div>
              <p className="font-medium leading-snug text-slate-900">{m.question_text}</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {Object.entries(m.options).map(([k, v]) => {
                  const ok = k === m.correct_option, bad = k === m.chosen && !ok;
                  return (
                    <li key={k} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${ok ? 'bg-emerald-50 font-semibold text-emerald-800' : bad ? 'bg-rose-50 font-semibold text-rose-800' : 'bg-slate-50 text-slate-700'}`}>
                      <span className="font-bold">{k}.</span><span className="flex-1">{v}</span>
                      {ok && <span className="text-xs">✓ Correct</span>}
                      {bad && <span className="text-xs">✗ Your answer</span>}
                    </li>
                  );
                })}
              </ul>
              {m.explanation && <p className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm leading-relaxed text-slate-700">💡 {m.explanation}</p>}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                {m.slug ? <Link to={`/exam/${m.slug}`} className="text-xs font-semibold text-indigo-600 hover:underline">Open exam →</Link> : <span />}
                <button onClick={() => removeMistake(m.id)} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">✓ I&apos;ve learned this</button>
              </div>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
