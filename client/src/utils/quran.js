// Number of ayahs in each of the 114 surahs (total 6236). Used to turn "surah:ayah" into the
// global ayah number that the Al-Quran Cloud API expects.
export const AYAH_COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

export const globalAyah = (surah, ayah) => AYAH_COUNTS.slice(0, surah - 1).reduce((s, n) => s + n, 0) + ayah;

export const RECITERS = [
  { id: 'ar.alafasy', name: 'Mishary Alafasy' },
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit (Murattal)' },
  { id: 'ar.husary', name: 'Mahmoud Al-Husary' },
];

const API = 'https://api.alquran.cloud/v1';
const memory = new Map();

// One request returns both the recitation (audio URL) and the Bangla translation of an ayah.
// Results are cached in memory and localStorage, so a second listen costs nothing.
export async function loadAyah(number, reciter) {
  const key = `${number}:${reciter}`;
  if (memory.has(key)) return memory.get(key);
  try {
    const saved = JSON.parse(localStorage.getItem(`tmk-q-${key}`) || 'null');
    if (saved?.audio) { memory.set(key, saved); return saved; }
  } catch { /* ignore */ }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API}/ayah/${number}/editions/${reciter},bn.bengali`, { signal: ctrl.signal });
    const json = await res.json();
    if (!res.ok || !Array.isArray(json.data)) throw new Error('Quran service error');
    const audio = json.data.find((e) => e.edition?.identifier === reciter || e.edition?.format === 'audio');
    const bn = json.data.find((e) => e.edition?.identifier === 'bn.bengali');
    if (!audio?.audio) throw new Error('No recitation found');
    const out = {
      audio: audio.audio,
      alt: audio.audioSecondary?.[0] || null,
      bn: bn?.text || '',
      bnBy: bn?.edition?.englishName || '',
    };
    memory.set(key, out);
    try { localStorage.setItem(`tmk-q-${key}`, JSON.stringify(out)); } catch { /* storage full */ }
    return out;
  } finally {
    clearTimeout(timer);
  }
}
