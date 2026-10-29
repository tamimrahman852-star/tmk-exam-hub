import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { mmss, num } from '../utils/format.js';
import ShareButtons from '../components/ShareButtons.jsx';
import ResultView from '../components/ResultView.jsx';
import Leaderboard from '../components/Leaderboard.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function TakeExam() {
  const { slug } = useParams();
  const endKey = `tmk-end-${slug}`;

  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('intro'); // intro | running | done
  const [name, setName] = useState(localStorage.getItem('tmk-name') || '');
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const answersRef = useRef({});
  answersRef.current = answers;
  const submitted = useRef(false);
  const endAt = useRef(0);

  useEffect(() => { api(`/api/exams/${slug}`).then(setExam).catch((e) => setError(e.message)); }, [slug]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    setConfirm(false);
    const total = exam.duration_minutes * 60;
    const timeTaken = Math.min(total, Math.max(0, Math.round((Date.now() - (endAt.current - total * 1000)) / 1000)));
    try {
      const r = await api(`/api/exams/${slug}/submit`, {
        method: 'POST',
        body: { studentName: name.trim(), answers: answersRef.current, timeTaken },
      });
      localStorage.removeItem(endKey);
      setResult(r);
      setPhase('done');
      window.scrollTo(0, 0);
    } catch (e) { submitted.current = false; setError(e.message); } finally { setBusy(false); }
  }, [slug, name, endKey, exam]);

  const start = () => {
    if (!name.trim()) return setError('Please enter your name to start.');
    setError('');
    localStorage.setItem('tmk-name', name.trim());
    // Reuse an unfinished timer so refreshing the page can't reset the clock.
    const stored = Number(localStorage.getItem(endKey));
    endAt.current = stored > Date.now() ? stored : Date.now() + exam.duration_minutes * 60000;
    localStorage.setItem(endKey, String(endAt.current));
    setLeft(Math.round((endAt.current - Date.now()) / 1000));
    setPhase('running');
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { clearInterval(id); submit(); }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, submit]);

  useEffect(() => {
    if (phase !== 'running') return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  const totalMarks = useMemo(() => (exam ? exam.questions.reduce((s, q) => s + Number(q.marks), 0) : 0), [exam]);

  if (error && !exam) return <p className="py-20 text-center text-red-600">{error}</p>;
  if (!exam) return <div className="mx-auto max-w-2xl"><div className="card h-64 animate-pulse bg-slate-100" /></div>;

  const url = window.location.href;
  const n = exam.questions.length;
  const answered = Object.keys(answers).length;
  const negative = exam.questions.some((q) => Number(q.negative_marks) > 0);

  // ---------- Intro ----------
  if (phase === 'intro') return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <h1 className="text-2xl font-extrabold leading-snug">{exam.title}</h1>
          {exam.description && <p className="mt-1 text-sm text-white/85">{exam.description}</p>}
        </div>
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['📝', n, 'Questions'], ['⏱', exam.duration_minutes, 'Minutes'], ['🎯', num(totalMarks), 'Total marks']].map(([i, v, t]) => (
              <div key={t} className="rounded-xl bg-slate-50 py-3">
                <p>{i}</p><p className="text-lg font-extrabold">{v}</p><p className="text-xs text-slate-500">{t}</p>
              </div>
            ))}
          </div>

          <ul className="space-y-1.5 text-sm text-slate-600">
            <li>• Every question has exactly one correct answer.</li>
            <li>• Once you answer, you can switch to another option but cannot clear it.</li>
            {negative && <li>• Wrong answers lose marks (negative marking).</li>}
            <li>• The exam submits automatically when the timer ends.</li>
          </ul>

          <div>
            <input className="input" placeholder="Your name (shown on the leaderboard)" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
          <button className="btn w-full !py-3 text-base" onClick={start}>Start exam →</button>
        </div>
      </div>

      <Leaderboard slug={slug} />
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold text-slate-700">Challenge your friends</p>
        <ShareButtons url={url} title={exam.title} />
      </div>
    </div>
  );

  // ---------- Result ----------
  if (phase === 'done') return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ResultView result={result} slug={slug} />
      <Leaderboard slug={slug} meId={result.attemptId} />
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold text-slate-700">Share this exam</p>
        <ShareButtons url={url} title={exam.title} />
      </div>
    </div>
  );

  // ---------- Running ----------
  const goTo = (i) => { setShowNav(false); setTimeout(() => document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); };

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-6">
      <div className="card sticky top-[60px] z-20 px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setShowNav(true)} className="text-sm font-semibold text-indigo-700">☰ {answered}/{n} answered</button>
          <span className={`rounded-full px-3 py-1 font-mono text-base font-bold ${left <= 60 ? 'animate-pulse bg-red-100 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>⏱ {mmss(left)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(answered / n) * 100}%` }} />
        </div>
      </div>

      {exam.questions.map((q, i) => (
        <div key={q.id} id={`q-${i}`} className="card p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="font-medium leading-snug"><span className="text-indigo-600">{i + 1}.</span> {q.question_text}</p>
            <span className="chip shrink-0">+{num(q.marks)}{Number(q.negative_marks) > 0 && ` / -${num(q.negative_marks)}`}</span>
          </div>
          <div className="space-y-2">
            {LETTERS.map((k) => {
              const sel = answers[q.id] === k;
              return (
                <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3 py-3 transition ${sel ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
                  <input type="radio" name={q.id} className="sr-only" checked={sel} onChange={() => setAnswers((a) => ({ ...a, [q.id]: k }))} />
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${sel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{k}</span>
                  <span className="pt-0.5 text-[15px] leading-snug">{q[`option_${k.toLowerCase()}`]}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <button className="btn w-full !py-3 text-base" disabled={busy} onClick={() => setConfirm(true)}>{busy ? 'Submitting…' : 'Submit exam'}</button>

      {showNav && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={() => setShowNav(false)}>
          <div className="w-full rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold">Question navigator</p>
              <button onClick={() => setShowNav(false)} className="text-slate-400">✕</button>
            </div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
              {exam.questions.map((q, i) => (
                <button key={q.id} onClick={() => goTo(i)}
                  className={`h-10 rounded-lg text-sm font-bold ${answers[q.id] ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500"><span className="font-bold text-indigo-600">Blue</span> = answered · <span className="font-bold">Grey</span> = not answered</p>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center">
            <p className="text-lg font-bold">Submit your exam?</p>
            <p className="text-sm text-slate-600">
              You answered <b>{answered}</b> of <b>{n}</b>.
              {n - answered > 0 && <> <b className="text-red-600">{n - answered}</b> question(s) are still unanswered.</>}
            </p>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setConfirm(false)}>Keep going</button>
              <button className="btn flex-1" onClick={submit}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
