import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import InspirationWidget from '../components/InspirationWidget.jsx';
import CountdownWidget from '../components/CountdownWidget.jsx';
import AnalyticsWidget from '../components/AnalyticsWidget.jsx';
import DailyQuizWidget from '../components/DailyQuizWidget.jsx';
import StreakWidget from '../components/StreakWidget.jsx';
import MistakeBook from '../components/MistakeBook.jsx';

const features = [
  ['⏱', 'Timed exams', 'Real exam pressure with a live countdown and negative marking.'],
  ['💡', 'Explanations', 'Every answer comes with an explanation, written by the creator or by AI.'],
  ['🏆', 'Leaderboards', 'See who is ahead, who skipped and who got it right.'],
];

export default function Home() {
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/api/exams').then(setExams).catch((e) => setError(e.message)); }, []);

  return (
    <div className="space-y-10">
      <section className="animate-fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-12 text-white shadow-xl shadow-indigo-600/20 sm:px-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <img src="/logo.png" alt="" className="absolute right-5 top-1/2 hidden h-36 w-36 -translate-y-1/2 rounded-full object-cover shadow-2xl ring-4 ring-white/40 sm:block sm:h-44 sm:w-44" />
        <h1 className="relative text-3xl font-black leading-tight sm:text-5xl">Practice smarter.<br />Compete harder.</h1>
        <p className="relative mt-4 max-w-md text-sm text-white/85 sm:text-base">
          Take timed exams, learn from explanations and climb the leaderboard.
        </p>
        <div className="relative mt-7 flex flex-wrap gap-3">
          <a href="#exams" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 shadow transition hover:-translate-y-px hover:shadow-lg">Browse exams</a>
          <Link to="/admin" className="rounded-xl border border-white/40 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Create an exam</Link>
        </div>
      </section>

      <CountdownWidget />
      <DailyQuizWidget />
      <div className="grid gap-4 md:grid-cols-2">
        <StreakWidget />
        <MistakeBook />
      </div>
      <AnalyticsWidget />
      <InspirationWidget />

      <section className="grid gap-3 sm:grid-cols-3">
        {features.map(([icon, title, text], i) => (
          <div key={title} className="card animate-fade-up p-4" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl">{icon}</span>
            <h3 className="mt-3 font-bold">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </section>

      <section id="exams" className="space-y-4 scroll-mt-20">
        <h2 className="text-xl font-extrabold">Available exams</h2>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {!exams && !error && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => <div key={i} className="card h-32 animate-pulse bg-slate-100" />)}
          </div>
        )}
        {exams?.length === 0 && <p className="card p-8 text-center text-slate-500">No exams yet. Create the first one!</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          {exams?.map((e, i) => (
            <Link key={e.id} to={`/exam/${e.slug}`} style={{ animationDelay: `${i * 60}ms` }}
              className="card group animate-fade-up flex flex-col justify-between p-5 transition duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg">
              <div>
                <h3 className="font-bold leading-snug text-slate-900 transition group-hover:text-indigo-700">{e.title}</h3>
                {e.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{e.description}</p>}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex gap-2">
                  {e.question_count != null && <span className="chip">📝 {e.question_count} Qs</span>}
                  <span className="chip">⏱ {e.duration_minutes} min</span>
                </div>
                <span className="text-sm font-semibold text-indigo-600 transition group-hover:translate-x-1">Start →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
