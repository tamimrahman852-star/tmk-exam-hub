import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { mmss, num } from '../utils/format.js';

const medal = ['🥇', '🥈', '🥉'];
const palette = ['from-indigo-500 to-violet-500', 'from-sky-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-rose-500 to-pink-500', 'from-amber-500 to-orange-500'];
const grad = (name) => palette[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length];
const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

function Avatar({ name, size = 'h-10 w-10 text-sm' }) {
  return <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${grad(name)} font-bold text-white shadow-sm`}>{initials(name)}</span>;
}

// green = correct, red = wrong, grey = skipped
function StatBar({ r }) {
  const total = r.correct + r.wrong + r.skipped || 1;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="bg-green-500" style={{ width: `${(r.correct / total) * 100}%` }} />
      <div className="bg-red-500" style={{ width: `${(r.wrong / total) * 100}%` }} />
      <div className="bg-slate-300" style={{ width: `${(r.skipped / total) * 100}%` }} />
    </div>
  );
}

const Stats = ({ r }) => (
  <span className="flex flex-wrap items-center gap-x-2.5 text-xs text-slate-500">
    <span className="font-semibold text-green-600">✅ {r.correct}</span>
    <span className="font-semibold text-red-600">❌ {r.wrong}</span>
    <span className="font-semibold text-slate-500">➖ {r.skipped}</span>
    {r.timeTaken != null && <span>⏱ {mmss(r.timeTaken)}</span>}
  </span>
);

function Podium({ rows }) {
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  const height = { 1: 'h-24', 2: 'h-16', 3: 'h-12' };
  const bar = { 1: 'from-amber-300 to-amber-500', 2: 'from-slate-300 to-slate-400', 3: 'from-orange-300 to-orange-500' };
  return (
    <div className="flex items-end justify-center gap-2 px-3 pt-5">
      {order.map((r) => (
        <div key={r.rank} className="flex w-1/3 max-w-[140px] flex-col items-center animate-fade-up" style={{ animationDelay: `${r.rank * 90}ms` }}>
          <span className="text-2xl">{medal[r.rank - 1]}</span>
          <div className={`rounded-full ${r.isMe ? 'ring-4 ring-indigo-300' : ''}`}><Avatar name={r.name} size="h-12 w-12 text-base" /></div>
          <p className="mt-1.5 w-full truncate text-center text-sm font-bold">{r.name}</p>
          <p className="text-sm font-extrabold text-indigo-700">{num(r.score)}<span className="text-[10px] font-medium text-slate-400"> pts</span></p>
          <p className="text-[11px] text-slate-500">✅{r.correct} ❌{r.wrong} ➖{r.skipped}</p>
          <div className={`mt-2 flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b ${bar[r.rank]} pt-1.5 text-lg font-black text-white/90 ${height[r.rank]}`}>{r.rank}</div>
        </div>
      ))}
    </div>
  );
}

export default function Leaderboard({ slug, meId, limit = 10 }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api(`/api/exams/${slug}/leaderboard${meId ? `?me=${meId}` : ''}`).then(setData).catch((e) => setErr(e.message));
  }, [slug, meId]);

  const rows = data?.rows.slice(0, limit) || [];
  const me = data?.rows.find((r) => r.isMe);
  const gap = me ? Math.max(0, data.topScore - me.score) : null;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 px-4 py-3">
        <h2 className="font-extrabold text-slate-800">🏆 Leaderboard</h2>
        {data && <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-slate-500">{data.participants} participant{data.participants === 1 ? '' : 's'}</span>}
      </div>

      {err && <p className="p-4 text-sm text-red-600">{err}</p>}
      {!data && !err && <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>}
      {data && rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No attempts yet. Be the first on the board! 🚀</p>}

      {me && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-3 text-white animate-fade-up">
          <span className="text-2xl font-black">#{data.myRank}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{num(me.score)} points · ✅ {me.correct} · ❌ {me.wrong} · ➖ {me.skipped}</p>
            <p className="text-xs text-white/80">{gap === 0 ? 'You are leading the board! 🎉' : `${num(gap)} point${gap === 1 ? '' : 's'} behind the leader`}</p>
          </div>
        </div>
      )}

      {rows.length > 0 && <Podium rows={rows} />}

      <ol className="divide-y pt-1">
        {rows.slice(3).map((r) => (
          <li key={r.rank} className={`flex items-center gap-3 px-4 py-3 transition ${r.isMe ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
            <span className="w-7 text-center text-sm font-bold text-slate-400">#{r.rank}</span>
            <Avatar name={r.name} size="h-9 w-9 text-xs" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-semibold">{r.name}{r.isMe && <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">YOU</span>}</p>
              <StatBar r={r} />
              <Stats r={r} />
            </div>
            <span className="text-right text-base font-extrabold text-indigo-700">{num(r.score)}<span className="block text-[10px] font-medium text-slate-400">/ {num(r.totalMarks)}</span></span>
          </li>
        ))}
      </ol>

      {data?.myRank && data.myRank > limit && <p className="border-t bg-indigo-50 px-4 py-2 text-center text-sm font-semibold text-indigo-700">Your rank: #{data.myRank}</p>}
    </section>
  );
}
