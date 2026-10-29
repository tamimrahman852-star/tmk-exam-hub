import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Home() {
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/api/exams').then(setExams).catch((e) => setError(e.message)); }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-10 text-white shadow-lg sm:px-10">
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Practice smarter.<br />Compete harder.</h1>
        <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">
          Take timed exams with negative marking, see the right answers with explanations, and climb the leaderboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#exams" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 shadow hover:bg-slate-100">Browse exams</a>
          <Link to="/admin" className="rounded-xl border border-white/40 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">Create an exam</Link>
        </div>
      </section>

      <section id="exams" className="space-y-4">
        <h2 className="text-xl font-bold">Available exams</h2>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {!exams && !error && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => <div key={i} className="card h-28 animate-pulse bg-slate-100" />)}
          </div>
        )}
        {exams?.length === 0 && <p className="card p-6 text-center text-slate-500">No exams yet. Create the first one!</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          {exams?.map((e) => (
            <Link key={e.id} to={`/exam/${e.slug}`} className="card group flex flex-col justify-between p-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
              <div>
                <h3 className="font-bold leading-snug text-slate-900 group-hover:text-indigo-700">{e.title}</h3>
                {e.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{e.description}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  {e.question_count != null && <span className="chip">📝 {e.question_count} Qs</span>}
                  <span className="chip">⏱ {e.duration_minutes} min</span>
                </div>
                <span className="text-sm font-semibold text-indigo-600">Start →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
