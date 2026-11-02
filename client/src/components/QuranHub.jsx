import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Portal from './Portal.jsx';
import { RECITER_NAME, audioUrls, cachedSurahs, fetchSurahs, fmtTime, resolveAlafasy } from '../utils/quranHub.js';

const TYPES = [['all', 'All Surahs'], ['Meccan', 'Makki'], ['Medinan', 'Madani']];
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, '');

function Equalizer() {
  return (
    <span aria-hidden className="flex h-4 items-end gap-0.5">
      {[0, 200, 400].map((d) => <span key={d} className="eq-bar block h-4 w-1 rounded-full bg-indigo-500" style={{ animationDelay: `${d}ms` }} />)}
    </span>
  );
}

function Spinner({ dark }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${dark ? 'border-white/40 border-t-white' : 'border-indigo-200 border-t-indigo-600'}`} />;
}

export default function QuranHub() {
  const [surahs, setSurahs] = useState(cachedSurahs);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');

  const [cur, setCur] = useState(null);                 // surah number being played
  const [status, setStatus] = useState('idle');         // idle | loading | playing | paused | error
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
  const [playError, setPlayError] = useState('');

  const audioRef = useRef(null);
  const serverRef = useRef(null);
  const urlsRef = useRef([]);
  const idxRef = useRef(0);
  const curRef = useRef(null);
  const repeatRef = useRef(false);
  const autoRef = useRef(true);
  repeatRef.current = repeat;
  autoRef.current = autoNext;

  // ----- surah list (Al-Quran Cloud) -----
  const loadSurahs = useCallback(() => {
    setLoadError('');
    fetchSurahs().then(setSurahs).catch((e) => setLoadError(e.message || 'Could not load the surah list'));
  }, []);
  useEffect(() => { if (!surahs) loadSurahs(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // ----- playback (MP3Quran) -----
  const play = useCallback((n) => {
    const a = audioRef.current;
    curRef.current = n;
    urlsRef.current = audioUrls(n, serverRef.current);
    idxRef.current = 0;
    setCur(n); setStatus('loading'); setPlayError(''); setTime(0); setDuration(0);
    a.src = urlsRef.current[0];                          // set synchronously inside the tap (required on iPhone)
    a.play()?.catch((e) => { if (e?.name === 'NotAllowedError') setStatus('paused'); });
  }, []);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'auto';
    audioRef.current = a;
    resolveAlafasy().then((r) => { serverRef.current = r; }).catch(() => {});

    a.onloadedmetadata = () => setDuration(a.duration || 0);
    a.ondurationchange = () => setDuration(a.duration || 0);
    a.ontimeupdate = () => setTime(a.currentTime || 0);
    a.onwaiting = () => setStatus('loading');
    a.onplaying = () => setStatus('playing');
    a.onplay = () => setStatus((s) => (s === 'error' ? s : 'playing'));
    a.onpause = () => { if (!a.ended) setStatus((s) => (s === 'loading' || s === 'error' ? s : 'paused')); };
    a.onended = () => {
      const n = curRef.current;
      if (repeatRef.current) { a.currentTime = 0; a.play()?.catch(() => {}); }
      else if (autoRef.current && n < 114) play(n + 1);
      else { setStatus('paused'); setTime(0); }
    };
    a.onerror = () => {                                  // try the next mirror, then give up
      idxRef.current += 1;
      const next = urlsRef.current[idxRef.current];
      if (next) { a.src = next; a.play()?.catch(() => {}); return; }
      setStatus('error');
      setPlayError('Could not play this surah. Check your internet connection and try again.');
    };
    return () => { a.pause(); a.onloadedmetadata = a.ondurationchange = a.ontimeupdate = a.onwaiting = a.onplaying = a.onplay = a.onpause = a.onended = a.onerror = null; a.src = ''; };
  }, [play]);

  const toggle = () => {
    const a = audioRef.current;
    if (status === 'playing' || status === 'loading') { a.pause(); setStatus('paused'); }
    else if (status === 'paused' && a.src) { a.play()?.catch(() => {}); }
    else if (cur) play(cur);
  };
  const onCard = (n) => (n === cur && status !== 'error' ? toggle() : play(n));
  const seek = (v) => { audioRef.current.currentTime = v; setTime(v); };

  // lock-screen / notification controls on phones
  const current = surahs?.find((s) => s.number === cur);
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.englishName, artist: RECITER_NAME, album: 'The Holy Quran',
      artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    const set = (k, f) => { try { navigator.mediaSession.setActionHandler(k, f); } catch { /* unsupported action */ } };
    set('play', () => audioRef.current.play()?.catch(() => {}));
    set('pause', () => audioRef.current.pause());
    set('previoustrack', cur > 1 ? () => play(cur - 1) : null);
    set('nexttrack', cur < 114 ? () => play(cur + 1) : null);
  }, [current, cur, play]);

  // ----- filtering -----
  const shown = useMemo(() => {
    if (!surahs) return [];
    const q = norm(query);
    return surahs.filter((s) =>
      (type === 'all' || s.revelationType === type) &&
      (!q || String(s.number) === q || norm(`${s.englishName} ${s.englishNameTranslation} ${s.name}`).includes(q)));
  }, [surahs, query, type]);
  const count = (t) => (t === 'all' ? surahs?.length : surahs?.filter((s) => s.revelationType === t).length) ?? 0;

  const busy = status === 'loading';
  const playing = status === 'playing';

  return (
    <div className={`mx-auto max-w-4xl space-y-5 ${cur ? 'pb-44' : ''}`}>
      <header className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-2xl">📖</span>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Quran Tilawat Hub</h1>
              <p className="text-sm text-slate-500">Listen to all 114 Surahs, recited by <span className="font-semibold text-slate-700">{RECITER_NAME}</span></p>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">🎧 114 Surahs · Full recitation</span>
        </div>
        <div className="space-y-3 border-t border-slate-100 p-4">
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, meaning or number (e.g. Baqara, The Cow, 36)"
              aria-label="Search surahs" className="input !pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(([k, label]) => (
              <button key={k} onClick={() => setType(k)} aria-pressed={type === k}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${type === k ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
                {label}{surahs ? ` (${count(k)})` : ''}
              </button>
            ))}
          </div>
        </div>
      </header>

      {!surahs && !loadError && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 9 }, (_, i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}
        </div>
      )}
      {loadError && (
        <div className="card space-y-3 p-6 text-center">
          <p role="alert" className="text-sm text-rose-700">{loadError}. Please check your internet connection.</p>
          <button className="btn" onClick={loadSurahs}>Try again</button>
        </div>
      )}
      {surahs && shown.length === 0 && <p className="card p-8 text-center text-sm text-slate-500">No surah matches “{query}”.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((s) => {
          const active = s.number === cur;
          return (
            <button key={s.number} onClick={() => onCard(s.number)}
              aria-label={`${active && playing ? 'Pause' : 'Play'} Surah ${s.number}: ${s.englishName}`}
              className={`card group flex items-center gap-3 p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 ${active ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-200' : ''}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold tabular-nums transition ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700'}`}>{s.number}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-slate-900">{s.englishName}</span>
                <span className="block truncate text-xs text-slate-500">{s.englishNameTranslation}</span>
                <span className="mt-1 flex gap-1.5 text-[10px] font-semibold text-slate-400">
                  <span>{s.numberOfAyahs} ayahs</span><span>·</span><span>{s.revelationType === 'Meccan' ? 'Makki' : 'Madani'}</span>
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <span lang="ar" dir="rtl" className="font-arabic text-xl leading-tight text-slate-800">{s.name}</span>
                {active && (busy ? <Spinner /> : playing ? <Equalizer /> : <span className="text-[10px] font-bold text-indigo-600">PAUSED</span>)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="pb-2 text-center text-[11px] text-slate-400">Surah list from Al-Quran Cloud · Audio from MP3Quran. An internet connection is needed to listen.</p>

      {cur && current && (
        <Portal>
        <div className="fixed inset-x-0 bottom-0 z-40 px-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div role="region" aria-label="Audio player" className="animate-sheet mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-900/15 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-extrabold text-white">{cur}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900">{current.englishName} <span lang="ar" className="font-arabic text-base text-slate-500">· {current.name}</span></p>
                <p className="truncate text-xs text-slate-500">{RECITER_NAME}{busy ? ' · Loading…' : ''}</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button onClick={() => play(cur - 1)} disabled={cur <= 1} aria-label="Previous surah" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:opacity-30">⏮</button>
                <button onClick={toggle} aria-label={playing || busy ? 'Pause' : 'Play'}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-95">
                  {busy ? <Spinner dark /> : playing ? '❚❚' : '▶'}
                </button>
                <button onClick={() => play(cur + 1)} disabled={cur >= 114} aria-label="Next surah" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:opacity-30">⏭</button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2.5">
              <span className="w-10 text-right text-[11px] font-medium tabular-nums text-slate-500">{fmtTime(time)}</span>
              <input type="range" min={0} max={duration || 0} step={1} value={Math.min(time, duration || 0)} disabled={!duration}
                onChange={(e) => seek(Number(e.target.value))} aria-label="Seek" className="h-1.5 flex-1 cursor-pointer accent-indigo-600 disabled:cursor-default" />
              <span className="w-12 text-[11px] font-medium tabular-nums text-slate-500">{fmtTime(duration)}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex gap-1.5">
                <button onClick={() => setRepeat((v) => !v)} aria-pressed={repeat} aria-label="Repeat this surah"
                  className={`rounded-full px-3 py-1 font-semibold transition ${repeat ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>🔁 Repeat</button>
                <button onClick={() => setAutoNext((v) => !v)} aria-pressed={autoNext} aria-label="Play the next surah automatically"
                  className={`rounded-full px-3 py-1 font-semibold transition ${autoNext ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>⏭ Auto-next</button>
              </div>
              {status === 'error' && (
                <span role="alert" className="flex items-center gap-2 text-rose-600">{playError}
                  <button onClick={() => play(cur)} className="font-bold underline">Retry</button>
                </span>
              )}
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
