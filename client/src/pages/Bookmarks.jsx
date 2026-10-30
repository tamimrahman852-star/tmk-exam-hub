import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBookmarks, removeBookmark, setBookmarkTag } from '../utils/bookmarks.js';

const FILTERS = [['all', 'All'], ['wrong', '❌ Wrong'], ['important', '⭐ Important']];

export default function Bookmarks() {
  const list = useBookmarks();
  const [filter, setFilter] = useState('all');
  const shown = list.filter((b) => filter === 'all' || b.tag === filter);
  const count = (f) => (f === 'all' ? list.length : list.filter((b) => b.tag === f).length);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Saved questions</h1>
        <p className="text-sm text-slate-500">Questions you saved from your results, kept on this device for quick revision.</p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-4xl">🔖</p>
          <p className="mt-2 font-bold text-slate-800">Nothing saved yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">After an exam, tap “Save” on any question, or “Save all wrong” to build your revision list.</p>
          <Link to="/" className="btn mt-4">Browse exams</Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([k, t]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${filter === k ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
                {t} ({count(k)})
              </button>
            ))}
          </div>

          {shown.length === 0 && <p className="card p-6 text-center text-sm text-slate-500">No questions in this list.</p>}

          {shown.map((b) => (
            <article key={b.id} className="card animate-fade-up p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="font-medium leading-snug text-slate-900">{b.question_text}</p>
                <button onClick={() => removeBookmark(b.id)} aria-label="Remove saved question" className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">🗑</button>
              </div>

              <ul className="space-y-1.5 text-sm">
                {Object.entries(b.options).map(([k, v]) => {
                  const isCorrect = k === b.correct_option;
                  const isWrongPick = k === b.chosen && !isCorrect;
                  return (
                    <li key={k} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${isCorrect ? 'bg-emerald-50 font-semibold text-emerald-800' : isWrongPick ? 'bg-rose-50 font-semibold text-rose-800' : 'bg-slate-50 text-slate-700'}`}>
                      <span className="font-bold">{k}.</span><span className="flex-1">{v}</span>
                      {isCorrect && <span className="text-xs">✓ Correct</span>}
                      {isWrongPick && <span className="text-xs">✗ Your answer</span>}
                    </li>
                  );
                })}
              </ul>

              {b.explanation && <p className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm leading-relaxed text-slate-700">💡 {b.explanation}</p>}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <Link to={`/exam/${b.slug}`} className="chip max-w-[60%] truncate hover:bg-slate-200">{b.examTitle}</Link>
                <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold" role="group" aria-label="Question label">
                  {[['wrong', '❌ Wrong'], ['important', '⭐ Important']].map(([t, label]) => (
                    <button key={t} onClick={() => setBookmarkTag(b.id, t)} aria-pressed={b.tag === t}
                      className={`rounded-full px-3 py-1 transition ${b.tag === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{label}</button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
