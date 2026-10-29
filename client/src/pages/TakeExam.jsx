import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import ShareButtons from '../components/ShareButtons.jsx';
import ResultView from '../components/ResultView.jsx';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function TakeExam() {
  const { slug } = useParams();
  const endKey = `tmk-end-${slug}`;

  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('intro'); // intro | running | done
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const answersRef = useRef({});
  answersRef.current = answers;
  const submitted = useRef(false);
  const endAt = useRef(0);

  useEffect(() => { api(`/api/exams/${slug}`).then(setExam).catch((e) => setError(e.message)); }, [slug]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
      const r = await api(`/api/exams/${slug}/submit`, { method: 'POST', body: { studentName: name, answers: answersRef.current } });
      localStorage.removeItem(endKey);
      setResult(r);
      setPhase('done');
      window.scrollTo(0, 0);
    } catch (e) { submitted.current = false; setError(e.message); } finally { setBusy(false); }
  }, [slug, name, endKey]);

  const start = () => {
    // Reuse an unfinished timer so refreshing the page can't reset the clock.
    const stored = Number(localStorage.getItem(endKey));
    endAt.current = stored > Date.now() ? stored : Date.now() + exam.duration_minutes * 60000;
    localStorage.setItem(endKey, String(endAt.current));
    setLeft(Math.round((endAt.current - Date.now()) / 1000));
    setPhase('running');
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

  if (error && !exam) return <p className="py-20 text-center text-red-600">{error}</p>;
  if (!exam) return <p className="py-20 text-center text-slate-500">Loading…</p>;

  const url = window.location.href;

  if (phase === 'intro') return (
    <div className="space-y-4 rounded-xl border bg-white p-6">
      <h1 className="text-2xl font-bold">{exam.title}</h1>
      {exam.description && <p className="text-slate-600">{exam.description}</p>}
      <p className="text-sm text-slate-500">{exam.questions.length} questions · {exam.duration_minutes} minutes</p>
      <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn w-full" onClick={start}>Start exam</button>
      <div className="border-t pt-4"><ShareButtons url={url} title={exam.title} /></div>
    </div>
  );

  if (phase === 'done') return (
    <div className="space-y-5">
      <ResultView result={result} />
      <ShareButtons url={url} title={exam.title} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-[53px] z-10 flex items-center justify-between rounded-xl border bg-white px-4 py-2 shadow-sm">
        <span className="text-sm text-slate-500">{Object.keys(answers).length}/{exam.questions.length} answered</span>
        <span className={`font-mono text-lg font-bold ${left <= 60 ? 'text-red-600' : 'text-indigo-700'}`}>⏱ {fmt(left)}</span>
      </div>

      {exam.questions.map((q, i) => (
        <div key={q.id} className="rounded-xl border bg-white p-4">
          <p className="mb-3 font-medium">{i + 1}. {q.question_text}
            <span className="ml-2 text-xs text-slate-400">(+{Number(q.marks)} / -{Number(q.negative_marks)})</span>
          </p>
          <div className="space-y-2">
            {['A', 'B', 'C', 'D'].map((k) => (
              <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${answers[q.id] === k ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-slate-50'}`}>
                <input type="radio" name={q.id} checked={answers[q.id] === k} onChange={() => setAnswers((a) => ({ ...a, [q.id]: k }))} />
                <span><b>{k}.</b> {q[`option_${k.toLowerCase()}`]}</span>
              </label>
            ))}
            {answers[q.id] && (
              <button className="text-xs text-slate-400 underline" onClick={() => setAnswers((a) => { const n = { ...a }; delete n[q.id]; return n; })}>Clear answer</button>
            )}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full" disabled={busy}
        onClick={() => { if (window.confirm('Submit your exam now?')) submit(); }}>
        {busy ? 'Submitting…' : 'Submit exam'}
      </button>
    </div>
  );
}
