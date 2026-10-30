import { useEffect, useState } from 'react';
import { EXAMS, targetMs, timeLeft, formatExamDate, nextExam } from '../utils/countdown.js';

const pad = (n) => String(n).padStart(2, '0');

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Unit({ value, label, accent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-2 py-4 text-center shadow-sm sm:py-5">
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <p className="text-3xl font-black tabular-nums leading-none text-slate-900 sm:text-5xl">{value}</p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-xs">{label}</p>
    </div>
  );
}

export default function CountdownWidget() {
  const now = useNow();
  const [id, setId] = useState(() => {
    const saved = localStorage.getItem('tmk-countdown');
    return EXAMS.some((e) => e.id === saved) ? saved : nextExam();
  });
  const exam = EXAMS.find((e) => e.id === id);
  const left = timeLeft(targetMs(exam.date), now);

  const pick = (next) => { setId(next); try { localStorage.setItem('tmk-countdown', next); } catch { /* ignore */ } };

  return (
    <section aria-label="Admission countdown" className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/70 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-base">⏳</span>
          Admission countdown
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <div role="tablist" aria-label="Choose an exam" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
          {EXAMS.map((e) => {
            const active = e.id === id;
            return (
              <button key={e.id} role="tab" aria-selected={active} onClick={() => pick(e.id)}
                className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200
                  ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {e.tab}
              </button>
            );
          })}
        </div>

        <div key={exam.id} className="animate-fade-up mt-3">
          <p className="text-base font-bold text-slate-900 sm:text-lg">{exam.title}</p>
          <p className="text-sm text-slate-500">📅 {formatExamDate(exam.date)}</p>

          <div role="timer" aria-live="off" className="mt-4 grid grid-cols-4 gap-2 sm:gap-4">
            <Unit value={pad(left.days)} label="Days" accent="from-indigo-500 to-violet-500" />
            <Unit value={pad(left.hours)} label="Hours" accent="from-sky-500 to-cyan-500" />
            <Unit value={pad(left.minutes)} label="Minutes" accent="from-emerald-500 to-teal-500" />
            <Unit value={pad(left.seconds)} label="Seconds" accent="from-amber-400 to-orange-500" />
          </div>

          {left.done ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">This exam date has passed. Check the official notice for the next date.</p>
          ) : (
            <p className="mt-4 text-sm font-medium text-slate-600">
              <span className="font-extrabold text-indigo-600">{left.days}</span> day{left.days === 1 ? '' : 's'} to go. Every mock test counts. 💪
            </p>
          )}
        </div>

        <p className="mt-3 text-[11px] leading-snug text-slate-400">Counts down to 12:00 AM (Dhaka time) on exam day. Dates can change, so always confirm with the official admission notice.</p>
      </div>
    </section>
  );
}
