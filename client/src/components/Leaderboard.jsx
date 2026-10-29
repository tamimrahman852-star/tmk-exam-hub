import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { mmss, num } from '../utils/format.js';

const medal = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ slug, meId, limit = 10 }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api(`/api/exams/${slug}/leaderboard${meId ? `?me=${meId}` : ''}`).then(setData).catch((e) => setErr(e.message));
  }, [slug, meId]);

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
        <h2 className="font-bold text-slate-800">🏆 Leaderboard</h2>
        {data && <span className="text-xs text-slate-500">{data.participants} participant{data.participants === 1 ? '' : 's'}</span>}
      </div>

      {err && <p className="p-4 text-sm text-red-600">{err}</p>}
      {!data && !err && <p className="p-4 text-sm text-slate-400">Loading…</p>}
      {data && data.rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No attempts yet. Be the first on the board!</p>}

      <ol className="divide-y">
        {data?.rows.slice(0, limit).map((r) => (
          <li key={r.rank} className={`flex items-center gap-3 px-4 py-3 ${r.isMe ? 'bg-indigo-50' : ''}`}>
            <span className="w-8 text-center text-lg font-bold text-slate-500">{medal[r.rank - 1] || `#${r.rank}`}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}{r.isMe && <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">YOU</span>}</p>
              <p className="text-xs text-slate-400">✅ {r.correct} · ❌ {r.wrong}{r.timeTaken != null && ` · ⏱ ${mmss(r.timeTaken)}`}</p>
            </div>
            <span className="text-right text-sm font-bold text-indigo-700">{num(r.score)}<span className="text-xs font-medium text-slate-400"> / {num(r.totalMarks)}</span></span>
          </li>
        ))}
      </ol>

      {data?.myRank && data.myRank > limit && (
        <p className="border-t bg-indigo-50 px-4 py-2 text-center text-sm font-semibold text-indigo-700">Your rank: #{data.myRank}</p>
      )}
    </section>
  );
}
