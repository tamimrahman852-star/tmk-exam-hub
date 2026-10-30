import { useEffect, useRef, useState } from 'react';
import { makePosterBlob } from '../utils/poster.js';
import { num } from '../utils/format.js';

const today = () => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());

export default function ResultShareCard({ result, title, url }) {
  const [msg, setMsg] = useState('');
  const blobRef = useRef(null);

  const attempted = result.correct + result.wrong;
  const accuracy = attempted ? Math.round((result.correct / attempted) * 100) : 0;
  const pct = result.totalMarks > 0 ? Math.max(0, Math.min(100, (result.score / result.totalMarks) * 100)) : 0;
  const text = `🏆 I scored ${num(result.score)}/${num(result.totalMarks)} (${accuracy}% accuracy) in "${title}" on TMK Exam Hub!\n✅ ${result.correct} correct · ❌ ${result.wrong} wrong · ➖ ${result.unanswered} skipped\nCan you beat me? ${url}`;

  // Build the poster image in the background so Share responds instantly.
  useEffect(() => {
    let alive = true;
    makePosterBlob({
      title, score: num(result.score), total: num(result.totalMarks), accuracy,
      correct: result.correct, wrong: result.wrong, skipped: result.unanswered, host: new URL(url, window.location.href).host,
    }).then((b) => { if (alive) blobRef.current = b; }).catch(() => { blobRef.current = null; });
    return () => { alive = false; };
  }, [result, title, url, accuracy]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      flash('Copied! Paste it in WhatsApp, Messenger or anywhere.');
      return true;
    } catch { flash('Could not copy. Please copy the link from the address bar.'); return false; }
  };

  const share = async () => {
    try {
      const blob = blobRef.current;
      if (blob) {
        const file = new File([blob], 'tmk-result.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title, text }); return; }
      }
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await copy();
    } catch (e) {
      if (e?.name !== 'AbortError') await copy(); // the user closing the share sheet is not an error
    }
  };

  const download = () => {
    if (!blobRef.current) return flash('The image is not ready yet. Try again in a moment.');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blobRef.current);
    a.download = 'tmk-exam-result.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const r = 44, c = 2 * Math.PI * r;

  return (
    <section aria-label="Shareable result card" className="card overflow-hidden">
      <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200" />
            <div className="leading-tight">
              <p className="text-sm font-extrabold text-slate-900">TMK Exam Hub</p>
              <p className="text-[11px] text-slate-500">Exam result · {today()}</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">🏆 Victory card</span>
        </div>

        <h3 className="mt-4 line-clamp-2 text-lg font-extrabold leading-snug text-slate-900">{title}</h3>

        <div className="mt-4 flex items-center gap-5">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
              <circle cx="50" cy="50" r={r} fill="none" stroke="#6366f1" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black tabular-nums text-slate-900">{num(result.score)}</span>
              <span className="text-[11px] text-slate-500">of {num(result.totalMarks)}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">{accuracy}% accuracy</span>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Correct', result.correct, 'text-emerald-600'], ['Wrong', result.wrong, 'text-rose-600'], ['Skipped', result.unanswered, 'text-slate-500']].map(([n, v, color]) => (
                <div key={n} className="rounded-xl border border-slate-200 bg-white py-1.5 shadow-sm">
                  <p className={`text-lg font-extrabold tabular-nums ${color}`}>{v}</p>
                  <p className="text-[10px] text-slate-500">{n}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={share}>↗ Share result</button>
          <button type="button" className="btn-ghost" onClick={copy}>📋 Copy text</button>
          <button type="button" className="btn-ghost" onClick={download}>⬇ Save image</button>
        </div>
        <p role="status" className="mt-2 min-h-[1.25rem] text-xs font-medium text-emerald-600">{msg}</p>
      </div>
    </section>
  );
}
