import { useMemo } from 'react';
import { useHistory, computeStats } from '../utils/history.js';

const tier = (p) => (p >= 70 ? { bar: 'from-emerald-400 to-green-500', text: 'text-emerald-600', stroke: '#10b981' }
  : p >= 40 ? { bar: 'from-amber-400 to-orange-500', text: 'text-amber-600', stroke: '#f59e0b' }
  : { bar: 'from-rose-400 to-red-500', text: 'text-rose-600', stroke: '#ef4444' });

function Gauge({ value }) {
  const len = Math.PI * 50;
  return (
    <div className="relative mx-auto h-24 w-44">
      <svg viewBox="0 0 120 66" className="h-full w-full">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#e2e8f0" strokeWidth="11" strokeLinecap="round" />
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke={tier(value).stroke} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - value / 100)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className={`text-3xl font-black tabular-nums leading-none ${tier(value).text}`}>{Math.round(value)}%</p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, bar }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><span>{icon}</span>{label}</div>
      <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">{value}</p>
      {bar != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full bg-gradient-to-r ${tier(bar).bar} transition-all duration-700`} style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
    </div>
  );
}

export default function AnalyticsWidget() {
  const history = useHistory();
  const s = useMemo(() => computeStats(history), [history]);

  if (!s.n) {
    return (
      <section aria-label="Performance analytics" className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center">
        <p className="text-3xl">📊</p>
        <h2 className="mt-2 font-extrabold text-slate-900">Your performance dashboard</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Take your first exam and your average score, accuracy and progress will show up here.</p>
        <a href="#exams" className="btn mt-4">Take an exam</a>
      </section>
    );
  }

  const answered = s.correct + s.wrong + s.skipped || 1;

  return (
    <section aria-label="Performance analytics" className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/70 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-base">📊</span> Your performance
        </h2>
        <span className="text-[11px] text-slate-400">On this device</span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat icon="📝" label="Exams taken" value={s.n} />
          <Stat icon="🎯" label="Average score" value={`${Math.round(s.avg)}%`} bar={s.avg} />
          <Stat icon="🏅" label="Best score" value={`${Math.round(s.best)}%`} bar={s.best} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-800">Accuracy meter</p>
            <p className="text-xs text-slate-500">Correct answers out of the questions you answered</p>
            <div className="mt-3"><Gauge value={s.accuracy} /></div>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="bg-emerald-500" style={{ width: `${(s.correct / answered) * 100}%` }} />
              <div className="bg-rose-500" style={{ width: `${(s.wrong / answered) * 100}%` }} />
              <div className="bg-slate-300" style={{ width: `${(s.skipped / answered) * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs font-semibold">
              <span className="text-emerald-600">✅ {s.correct} correct</span>
              <span className="text-rose-600">❌ {s.wrong} wrong</span>
              <span className="text-slate-500">➖ {s.skipped} skipped</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-800">Recent scores</p>
            <p className="text-xs text-slate-500">Your last {s.recent.length} exam{s.recent.length === 1 ? '' : 's'}</p>
            <div className="mt-4 flex h-28 items-end gap-2">
              {s.recent.map((r, i) => (
                <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${r.title}: ${Math.round(r.pct)}%`}>
                  <span className="text-[10px] font-bold text-slate-500">{Math.round(r.pct)}</span>
                  <div className={`w-full rounded-t-lg bg-gradient-to-t ${tier(r.pct).bar} transition-all duration-700`} style={{ height: `${Math.max(6, r.pct * 0.8)}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
