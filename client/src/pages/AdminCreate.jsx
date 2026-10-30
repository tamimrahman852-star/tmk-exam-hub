import { useState } from 'react';
import { api } from '../api.js';
import QuestionCard from '../components/QuestionCard.jsx';
import BulkImport from '../components/BulkImport.jsx';
import ShareButtons from '../components/ShareButtons.jsx';

const blank = (marks, negative) => ({ text: '', a: '', b: '', c: '', d: '', correct: 'A', marks, negative, explanation: '' });
const fresh = () => ({ title: '', description: '', duration: 30, marks: 1, negative: 0.25 });

export default function AdminCreate() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('tmk-admin-key') || '');
  const [exam, setExam] = useState(fresh());
  const [questions, setQuestions] = useState([blank(1, 0.25)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const patch = (i, p) => setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...p } : q)));

  const importQuestions = (list) => {
    const mapped = list.map((q) => ({
      text: q.question_text, a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d,
      correct: q.correct_option, marks: exam.marks, negative: exam.negative, explanation: q.explanation || '',
    }));
    setQuestions((prev) => {
      const onlyEmpty = prev.length === 1 && !prev[0].text && !prev[0].a;
      return [...(onlyEmpty ? [] : prev), ...mapped];
    });
  };

  const missing = questions.filter((q) => !q.correct).length;

  const save = async () => {
    setError('');
    if (missing) return setError(`${missing} question(s) have no correct answer selected (marked red).`);
    setBusy(true);
    try {
      localStorage.setItem('tmk-admin-key', adminKey);
      const res = await api('/api/admin/exams', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
        body: {
          title: exam.title,
          description: exam.description,
          duration_minutes: Number(exam.duration),
          questions: questions.map((q) => ({
            question_text: q.text, option_a: q.a, option_b: q.b, option_c: q.c, option_d: q.d,
            correct_option: q.correct, marks: q.marks, negative_marks: q.negative, explanation: q.explanation,
          })),
        },
      });
      setCreated(res.slug);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (created) {
    const url = `${window.location.origin}/exam/${created}`;
    return (
      <div className="card mx-auto max-w-xl space-y-4 p-6">
        <h1 className="text-xl font-bold text-green-700">Exam created 🎉</h1>
        <p className="break-all rounded bg-slate-100 p-2 text-sm">{url}</p>
        <ShareButtons url={url} title={exam.title} />
        <button className="btn-ghost" onClick={() => { setCreated(null); setExam(fresh()); setQuestions([blank(1, 0.25)]); }}>
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Create an exam</h1>
        <p className="text-sm text-slate-500">Upload a question page photo or type questions by hand. Students get a shareable link and a leaderboard.</p>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wide text-indigo-600">Step 1 · Exam details</h2>
      <div className="card space-y-3 p-4">
        <input type="password" className="input" placeholder="Admin key (leave empty if public creation is on)" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
        <input className="input" placeholder="Exam title" value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} />
        <textarea className="input" rows={2} placeholder="Description (optional)" value={exam.description} onChange={(e) => setExam({ ...exam, description: e.target.value })} />
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-slate-500">Duration (min)
            <input type="number" min="1" className="input mt-1" value={exam.duration} onChange={(e) => setExam({ ...exam, duration: e.target.value })} />
          </label>
          <label className="text-xs text-slate-500">Marks / question
            <input type="number" step="0.25" min="0" className="input mt-1" value={exam.marks} onChange={(e) => setExam({ ...exam, marks: e.target.value })} />
          </label>
          <label className="text-xs text-slate-500">Negative marks
            <input type="number" step="0.25" className="input mt-1" value={exam.negative} onChange={(e) => setExam({ ...exam, negative: e.target.value })} />
          </label>
        </div>
        <p className="text-xs text-slate-400">Marks and negative marks apply to newly added or imported questions. You can still edit each question.</p>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wide text-indigo-600">Step 2 · Add questions</h2>
      <BulkImport adminKey={adminKey} onImport={importQuestions} />

      {questions.map((q, i) => (
        <QuestionCard key={i} index={i} q={q} canRemove={questions.length > 1}
          onChange={(p) => patch(i, p)} onRemove={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} />
      ))}

      <button className="btn-ghost w-full" onClick={() => setQuestions((qs) => [...qs, blank(exam.marks, exam.negative)])}>+ Add question</button>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/90 p-2.5 shadow-lg backdrop-blur">
        <button className="btn w-full" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : `Step 3 · Save ${questions.length} question${questions.length === 1 ? '' : 's'} & get share link`}
        </button>
        {missing > 0 && <p className="mt-1.5 text-center text-xs font-medium text-red-600">{missing} question(s) still need a correct answer</p>}
      </div>
    </div>
  );
}
