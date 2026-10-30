import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GOALS, computeStreak, getGoal, setGoal, useActivity } from '../utils/activity.js';

const badge = (n) => (n >= 30 ? '👑 Unstoppable' : n >= 14 ? '🏆 Two-week champion' : n >= 7 ? '⚡ Week warrior' : n >= 3 ? '🚀 On a roll' : n >= 1 ? '🌱 Getting started' : null);

export default function StreakWidget() {
  const activity = useActivity();
  const [goal, setGoalState] = useState(getGoal);
  useEffect(() => {
    const sync = () => setGoalState(getGoal());
    window.addEventListener('tmk-storage', sync);
    return () => window.removeEventListener('tmk-storage', sync);
  }, []);

  const s = useMemo(() => computeStreak(activity), [activity]);
  const pct = Math.min(100, (s.questionsToday / goal) * 100);
  const reached = s.questionsToday >= goal;

  return (
    <section aria-label="Study streak" className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-orange-50/80 via-white to-amber-50/80 px-4 py-3">
        <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-base">🔥</span> Study streak
        </h2>
        {badge(s.current) && <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700">{badge(s.current)}</span>}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl ${s.alive ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/25' : 'bg-slate-100 text-slate-400'}`}>
            <span className="text-3xl font-black leading-none tabular-nums">{s.current}</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">{s.current === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="min-w-0 text-sm">
            <p className="text-lg font-extrabold text-slate-900">{s.alive ? `🔥 ${s.current} Day${s.current === 1 ? '' : 's'} Streak` : 'No streak yet'}</p>
            {s.doneToday && <p className="font-medium text-emerald-600">✅ Today is done. Your streak is safe!</p>}
            {s.atRisk && <p className="font-medium text-amber-700">⚠️ Finish 1 exam or quiz today to keep your streak.</p>}
            {!s.alive && <p className="text-slate-500">Take an exam or the daily quiz to start one.</p>}
            <p className="mt-0.5 text-xs text-slate-400">Longest streak: {s.longest} day{s.longest === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5" aria-label="Last 7 days">
          {s.week.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${d.done ? 'bg-emerald-500 text-white' : d.today ? 'bg-white text-indigo-600 ring-2 ring-indigo-400' : 'bg-slate-100 text-slate-300'}`}>
                {d.done ? '✓' : d.today ? '•' : ''}
              </span>
              <span className={`text-[10px] font-semibold ${d.today ? 'text-indigo-600' : 'text-slate-400'}`}>{d.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-800">🎯 Daily goal</p>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="sr-only">Daily goal</span>
              <select value={goal} onChange={(e) => setGoal(Number(e.target.value))} aria-label="Daily goal in questions"
                className="rounded-lg border-0 bg-white py-1 pl-2 pr-6 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-300">
                {GOALS.map((g) => <option key={g} value={g}>{g} questions</option>)}
              </select>
            </label>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, s.questionsToday)}>
            <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${reached ? 'from-emerald-400 to-green-500' : 'from-indigo-500 to-violet-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-medium text-slate-600">
            {reached ? '🎉 Daily goal reached! ' : ''}{s.questionsToday} / {goal} questions answered today
          </p>
          {!reached && <Link to="/" onClick={() => document.getElementById('exams')?.scrollIntoView({ behavior: 'smooth' })} className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:underline">Practice now →</Link>}
        </div>
      </div>
    </section>
  );
}
