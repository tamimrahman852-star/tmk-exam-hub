import { Link } from 'react-router-dom';
import { useMistakes } from '../utils/mistakes.js';

// Home card: every wrong answer from exams and the daily quiz is collected here automatically.
export default function MistakeBook() {
  const list = useMistakes();
  const fromExams = list.filter((m) => m.source === 'exam').length;
  const fromQuiz = list.filter((m) => m.source === 'daily').length;
  const repeated = list.filter((m) => (m.count || 1) > 1).length;

  return (
    <section aria-label="Mistake book" className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-rose-50/80 via-white to-orange-50/60 px-4 py-3">
        <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-base">📕</span> Mistake Book
        </h2>
        {list.length > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">{list.length} to revise</span>}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-3xl">🎉</p>
          <p className="font-bold text-slate-800">No mistakes saved yet</p>
          <p className="max-w-xs text-sm text-slate-500">Questions you get wrong in exams and the daily quiz are collected here automatically, so you can revise only what you missed.</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-end gap-3">
            <p className="text-5xl font-black leading-none tabular-nums text-rose-600">{list.length}</p>
            <p className="pb-1 text-sm font-medium text-slate-500">question{list.length === 1 ? '' : 's'} waiting for revision</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">📝 {fromExams} from exams</span>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">🎯 {fromQuiz} from daily quiz</span>
            {repeated > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">🔁 {repeated} missed more than once</span>}
          </div>
          <ul className="space-y-1.5">
            {list.slice(0, 2).map((m) => (
              <li key={m.id} className="truncate rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{m.question_text}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-slate-100 bg-white p-3">
        <Link to="/mistakes" className={`btn w-full ${list.length === 0 ? '!from-slate-500 !to-slate-600' : ''}`}>📖 Review Mistakes{list.length > 0 ? ` (${list.length})` : ''}</Link>
      </div>
    </section>
  );
}
