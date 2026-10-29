import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Home() {
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/api/exams').then(setExams).catch((e) => setError(e.message)); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Available Exams</h1>
      {error && <p className="text-red-600">{error}</p>}
      {!exams && !error && <p className="text-slate-500">Loading…</p>}
      {exams?.length === 0 && <p className="text-slate-500">No exams yet.</p>}
      {exams?.map((e) => (
        <Link key={e.id} to={`/exam/${e.slug}`} className="block rounded-xl border bg-white p-4 shadow-sm transition hover:border-indigo-400">
          <h2 className="font-semibold">{e.title}</h2>
          {e.description && <p className="text-sm text-slate-500">{e.description}</p>}
          <p className="mt-1 text-xs text-slate-400">⏱ {e.duration_minutes} min</p>
        </Link>
      ))}
    </div>
  );
}
