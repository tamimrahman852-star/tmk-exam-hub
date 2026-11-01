// Data + audio sources for the Quran Tilawat Hub.
//  - Surah list (names, translation, number): Al-Quran Cloud API
//  - Full-surah recitation by Mishary Rashid Alafasy: MP3Quran API (with two backup servers)
const ALQURAN = 'https://api.alquran.cloud/v1';
const MP3QURAN = 'https://mp3quran.net/api/v3';
export const RECITER_NAME = 'Mishary Rashid Alafasy';

const SURAH_KEY = 'tmk-surahs-v1';
const AFS_KEY = 'tmk-afs-v1';
const pad = (n) => String(n).padStart(3, '0');

async function getJson(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

export function cachedSurahs() {
  try {
    const v = JSON.parse(localStorage.getItem(SURAH_KEY) || 'null');
    return Array.isArray(v) && v.length === 114 ? v : null;
  } catch { return null; }
}

// The surah list never changes, so it is saved on the device after the first load (works offline afterwards).
export async function fetchSurahs() {
  const saved = cachedSurahs();
  if (saved) return saved;
  const json = await getJson(`${ALQURAN}/surah`);
  if (!Array.isArray(json.data) || !json.data.length) throw new Error('Could not read the surah list');
  const list = json.data.map(({ number, name, englishName, englishNameTranslation, numberOfAyahs, revelationType }) =>
    ({ number, name, englishName, englishNameTranslation, numberOfAyahs, revelationType }));
  if (list.length === 114) { try { localStorage.setItem(SURAH_KEY, JSON.stringify(list)); } catch { /* storage full */ } }
  return list;
}

const letters = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

function pickServer(reciters) {
  const r = reciters.find((x) => letters(x.name).includes('afasy'));   // "Mishari Rashid Al-`Afasy" and spelling variants
  if (!r) return null;
  const best = [...(r.moshaf || [])].filter((m) => m.server).sort((a, b) => (b.surah_total || 0) - (a.surah_total || 0))[0];
  if (!best) return null;
  return {
    server: best.server.endsWith('/') ? best.server : `${best.server}/`,
    has: String(best.surah_list || '').split(',').map(Number).filter(Boolean),
  };
}

// Finds Alafasy's audio server in the MP3Quran catalogue (small request first, full catalogue as a fallback).
export async function resolveAlafasy() {
  try { const c = JSON.parse(localStorage.getItem(AFS_KEY) || 'null'); if (c?.server) return c; } catch { /* ignore */ }
  let found = null;
  try { found = pickServer((await getJson(`${MP3QURAN}/reciters?language=eng&reciter=123`)).reciters || []); } catch { /* try the full list */ }
  if (!found) { try { found = pickServer((await getJson(`${MP3QURAN}/reciters?language=eng`, 20000)).reciters || []); } catch { /* use backups */ } }
  if (found) { try { localStorage.setItem(AFS_KEY, JSON.stringify(found)); } catch { /* ignore */ } }
  return found;
}

// Candidate MP3 links for one surah, best first. The player tries the next link if one fails.
export function audioUrls(n, resolved) {
  const list = [];
  if (resolved?.server && (!resolved.has?.length || resolved.has.includes(n))) list.push(`${resolved.server}${pad(n)}.mp3`);
  list.push(`https://server8.mp3quran.net/afs/${pad(n)}.mp3`);
  list.push(`https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasy/${pad(n)}.mp3`);
  return [...new Set(list)];
}

export function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
