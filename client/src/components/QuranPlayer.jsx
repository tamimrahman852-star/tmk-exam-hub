import { useCallback, useEffect, useRef, useState } from 'react';
import { RECITERS, loadAyah } from '../utils/quran.js';

// A 0-length silent clip. Playing it inside the tap "unlocks" the audio element on iPhone/Safari,
// so the real recitation can start after the network request finishes.
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

const Spinner = () => <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />;

export default function QuranPlayer({ ayahs, firstAyah = 1, partial = false }) {
  const [reciter, setReciter] = useState(() => localStorage.getItem('tmk-reciter') || RECITERS[0].id);
  const [status, setStatus] = useState('idle'); // idle | loading | playing | paused | error
  const [progress, setProgress] = useState(0);
  const [loop, setLoop] = useState(false);
  const [error, setError] = useState('');
  const [bnOpen, setBnOpen] = useState(false);
  const [bn, setBn] = useState({ loading: false, error: '', parts: [], by: '' });

  const audioRef = useRef(null);
  const clipsRef = useRef(null);
  const indexRef = useRef(0);
  const triedAlt = useRef(false);
  const loopRef = useRef(false);
  loopRef.current = loop;
  const key = ayahs.join(',');

  const startClip = useCallback((i) => {
    const a = audioRef.current;
    const clips = clipsRef.current;
    indexRef.current = i;
    triedAlt.current = false;
    a.src = clips[i].audio;
    a.currentTime = 0;
    a.play()?.catch(() => { setStatus('error'); setError('Tap play again to start the recitation.'); });
  }, []);

  // One audio element per card; reset when the dua or reciter changes.
  useEffect(() => {
    const a = new Audio();
    audioRef.current = a;
    clipsRef.current = null;
    indexRef.current = 0;
    const real = () => !String(a.src).startsWith('data:');

    a.onplay = () => { if (real()) setStatus('playing'); };
    a.onpause = () => { if (real() && !a.ended) setStatus('paused'); };
    a.ontimeupdate = () => {
      if (!real() || !clipsRef.current) return;
      setProgress(((indexRef.current + (a.currentTime / (a.duration || 1))) / clipsRef.current.length) * 100);
    };
    a.onended = () => {
      const clips = clipsRef.current;
      if (indexRef.current + 1 < clips.length) startClip(indexRef.current + 1);
      else if (loopRef.current) startClip(0);
      else { setStatus('idle'); setProgress(0); indexRef.current = 0; }
    };
    a.onerror = () => {
      if (!real()) return;
      const clip = clipsRef.current?.[indexRef.current];
      if (clip?.alt && !triedAlt.current) { triedAlt.current = true; a.src = clip.alt; a.play()?.catch(() => {}); return; }
      setStatus('error'); setError('Could not play the recitation. Check your internet and try again.');
    };
    return () => { a.pause(); a.onplay = a.onpause = a.ontimeupdate = a.onended = a.onerror = null; a.src = ''; };
  }, [key, reciter, startClip]);

  useEffect(() => { setStatus('idle'); setProgress(0); setError(''); setBnOpen(false); setBn({ loading: false, error: '', parts: [], by: '' }); }, [key]);
  useEffect(() => { setStatus('idle'); setProgress(0); setError(''); }, [reciter]);

  const toggle = async () => {
    const a = audioRef.current;
    if (status === 'playing') return a.pause();
    if (status === 'paused') return a.play()?.catch(() => {});
    if (status === 'loading') return;

    // unlock the element synchronously inside the tap (needed on iPhone)
    a.src = SILENCE;
    a.play()?.catch(() => {});
    setStatus('loading'); setError('');
    try {
      if (!clipsRef.current) clipsRef.current = await Promise.all(ayahs.map((n) => loadAyah(n, reciter)));
      startClip(0);
    } catch {
      setStatus('error'); setError('Could not load the recitation. Check your internet and try again.');
    }
  };

  const restart = () => { if (clipsRef.current) { setProgress(0); startClip(0); } };

  const toggleBn = async () => {
    const next = !bnOpen;
    setBnOpen(next);
    if (!next || bn.parts.length || bn.loading) return;
    setBn((b) => ({ ...b, loading: true, error: '' }));
    try {
      const data = await Promise.all(ayahs.map((n) => loadAyah(n, reciter)));
      setBn({ loading: false, error: '', parts: data.map((d) => d.bn).filter(Boolean), by: data[0]?.bnBy || '' });
    } catch {
      setBn({ loading: false, error: 'Could not load the Bangla translation. Check your internet and try again.', parts: [], by: '' });
    }
  };

  const busy = status === 'loading';
  const label = status === 'playing' ? 'Pause recitation' : busy ? 'Loading recitation' : 'Listen to the recitation';

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggle} aria-label={label}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-300 text-lg text-emerald-950 shadow-lg shadow-black/20 transition hover:scale-105 active:scale-95">
            {busy ? <Spinner /> : status === 'playing' ? '❚❚' : '▶'}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-100/80">
              <span>{busy ? 'Loading…' : status === 'playing' ? 'Playing recitation' : status === 'paused' ? 'Paused' : '🎧 Listen to tilawat'}</span>
              <span className="flex items-center gap-1">
                <button type="button" onClick={restart} aria-label="Play again from the start" className="rounded-full px-1.5 py-0.5 hover:bg-white/10">⏮</button>
                <button type="button" onClick={() => setLoop((v) => !v)} aria-label="Repeat" aria-pressed={loop}
                  className={`rounded-full px-1.5 py-0.5 transition ${loop ? 'bg-amber-300/25 text-amber-200' : 'hover:bg-white/10'}`}>🔁</button>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <select value={reciter} aria-label="Reciter"
            onChange={(e) => { setReciter(e.target.value); localStorage.setItem('tmk-reciter', e.target.value); }}
            className="max-w-[60%] rounded-lg border-0 bg-white/10 py-1 pl-2 pr-6 text-[11px] font-medium text-emerald-50 outline-none focus:ring-2 focus:ring-amber-300/60">
            {RECITERS.map((r) => <option key={r.id} value={r.id} className="text-slate-800">{r.name}</option>)}
          </select>
          {partial && <span className="text-[10px] leading-tight text-emerald-200/60">Plays the complete ayah</span>}
        </div>
        {error && <p role="alert" className="mt-2 rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs text-red-100">{error}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
        <button type="button" onClick={toggleBn} aria-expanded={bnOpen}
          className="flex w-full items-center justify-between bg-white/10 px-4 py-2.5 text-left text-sm font-semibold text-emerald-50 transition hover:bg-white/15">
          <span>📖 বাংলা অনুবাদ</span>
          <span className={`transition-transform duration-300 ${bnOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${bnOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="space-y-2.5 bg-black/15 px-4 py-3 text-left text-[15px] leading-relaxed text-emerald-50">
              {bn.loading && (
                <div className="space-y-2"><div className="h-3 w-full animate-pulse rounded bg-white/15" /><div className="h-3 w-5/6 animate-pulse rounded bg-white/15" /><div className="h-3 w-2/3 animate-pulse rounded bg-white/15" /></div>
              )}
              {bn.error && <p className="text-sm text-red-200">{bn.error}</p>}
              {bn.parts.map((t, i) => (
                <p key={i} className="flex gap-2">
                  {bn.parts.length > 1 && <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-300/20 text-[10px] font-bold text-amber-200">{firstAyah + i}</span>}
                  <span>{t}</span>
                </p>
              ))}
              {bn.parts.length > 0 && <p className="border-t border-white/10 pt-2 text-[11px] text-emerald-200/60">বাংলা অনুবাদ{bn.by ? ` · ${bn.by}` : ''} · via Al-Quran Cloud</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
