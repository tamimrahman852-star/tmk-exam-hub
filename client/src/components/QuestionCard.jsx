import { useState } from 'react';
import { ocrImage, parseQuestion } from '../utils/ocr.js';

export default function QuestionCard({ index, q, onChange, onRemove, canRemove }) {
  const [status, setStatus] = useState('');
  const [lang, setLang] = useState('eng');

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setStatus('Reading image… 0%');
      const raw = await ocrImage(file, lang, (p) => setStatus(`Reading image… ${p}%`));
      const parsed = parseQuestion(raw);
      onChange({
        text: parsed.text || q.text,
        a: parsed.a || q.a, b: parsed.b || q.b, c: parsed.c || q.c, d: parsed.d || q.d,
        correct: parsed.correct || q.correct,
      });
      setStatus('Done. Please review the extracted text before saving.');
    } catch {
      setStatus('Could not read this image. Try a clearer picture.');
    }
  };

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Question {index + 1}</h3>
        {canRemove && <button type="button" onClick={onRemove} className="text-sm text-red-600">Remove</button>}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm">
        <label className="btn-ghost cursor-pointer !py-1">
          📷 Upload image (OCR)
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </label>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="input !w-auto !py-1">
          <option value="eng">English</option>
          <option value="eng+ben">English + Bangla</option>
        </select>
        {status && <span className="text-xs text-slate-600">{status}</span>}
      </div>

      <textarea className="input" rows={3} placeholder="Question text" value={q.text} onChange={(e) => onChange({ text: e.target.value })} />

      <div className="grid gap-2 sm:grid-cols-2">
        {['a', 'b', 'c', 'd'].map((k) => (
          <input key={k} className="input" placeholder={`Option ${k.toUpperCase()}`} value={q[k]} onChange={(e) => onChange({ [k]: e.target.value })} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className={`text-xs ${q.correct ? 'text-slate-500' : 'text-red-600'}`}>Correct answer
          <select className="input mt-1" value={q.correct} onChange={(e) => onChange({ correct: e.target.value })}>
            <option value="">Select…</option>
            {['A', 'B', 'C', 'D'].map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">Marks (+)
          <input type="number" step="0.25" min="0" className="input mt-1" value={q.marks} onChange={(e) => onChange({ marks: e.target.value })} />
        </label>
        <label className="text-xs text-slate-500">Negative (e.g. -0.25)
          <input type="number" step="0.25" className="input mt-1" value={q.negative} onChange={(e) => onChange({ negative: e.target.value })} />
        </label>
      </div>
    </div>
  );
}
