import { useState } from 'react';
import { api } from '../api.js';
import QuestionCard from '../components/QuestionCard.jsx';
import ShareButtons from '../components/ShareButtons.jsx';

const emptyQ = () => ({ text: '', a: '', b: '', c: '', d: '', correct: 'A', marks: 1, negative: 0.25 });

export default function AdminCreate() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('tmk-admin-key') || '');
  const [exam, setExam] = useState({ title: '', description: '', duration: 30 });
  const [questions, setQuestions] = useState([emptyQ()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const patch = (i, p) => setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...p } : q)));

  const save = async () => {
    setError(''); setBusy(true);
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
            correct_option: q.correct, marks: q.marks, negative_marks: q.negative,
          })),
        },
      });
      setCreated(res.slug);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (created) {
    const url = `${window.location.origin}/exam/${created}`;
    return (
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <h1 className="text-xl font-bold text-green-700">Exam created 🎉</h1>
        <p className="break-all rounded bg-slate-100 p-2 text-sm">{url}</p>
        <ShareButtons url={url} title={exam.title} />
        <button className="btn-ghost" onClick={() => { setCreated(null); setExam({ title: '', description: '', duration: 30 }); setQuestions([emptyQ()]); }}>
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Create Exam</h1>

      <div className="space-y-3 rounded-xl border bg-white p-4">
        <input type="password" className="input" placeholder="Admin key" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
        <input className="input" placeholder="Exam title" value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} />
        <textarea className="input" rows={2} placeholder="Description (optional)" value={exam.description} onChange={(e) => setExam({ ...exam, description: e.target.value })} />
        <label className="block text-xs text-slate-500">Duration (minutes)
          <input type="number" min="1" className="input mt-1" value={exam.duration} onChange={(e) => setExam({ ...exam, duration: e.target.value })} />
        </label>
      </div>

      {questions.map((q, i) => (
        <QuestionCard key={i} index={i} q={q} canRemove={questions.length > 1}
          onChange={(p) => patch(i, p)} onRemove={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} />
      ))}

      <button className="btn-ghost w-full" onClick={() => setQuestions((qs) => [...qs, emptyQ()])}>+ Add question</button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save & get share link'}</button>
    </div>
  );
}
