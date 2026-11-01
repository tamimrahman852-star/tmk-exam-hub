import { vi } from 'vitest';
import { audioUrls, cachedSurahs, fetchSurahs, fmtTime, resolveAlafasy } from './quranHub.js';

const json = (data, ok = true, status = 200) => ({ ok, status, json: async () => data });
const apiSurahs = Array.from({ length: 114 }, (_, i) => ({ number: i + 1, name: `س${i + 1}`, englishName: `Surah ${i + 1}`, englishNameTranslation: `T${i + 1}`, numberOfAyahs: 7, revelationType: i % 2 ? 'Medinan' : 'Meccan', extra: 'dropped' }));

beforeEach(() => localStorage.clear());

test('fmtTime handles minutes, hours and bad input', () => {
  expect(fmtTime(0)).toBe('0:00');
  expect(fmtTime(65)).toBe('1:05');
  expect(fmtTime(3725)).toBe('1:02:05');
  expect(fmtTime(NaN)).toBe('0:00');
});

test('audioUrls: resolved server first, then two backups, 3-digit surah numbers, no duplicates', () => {
  expect(audioUrls(1, null)).toEqual([
    'https://server8.mp3quran.net/afs/001.mp3',
    'https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasy/001.mp3',
  ]);
  const withServer = audioUrls(114, { server: 'https://s.test/afs/', has: [] });
  expect(withServer[0]).toBe('https://s.test/afs/114.mp3');
  expect(withServer).toHaveLength(3);
  expect(audioUrls(5, { server: 'https://server8.mp3quran.net/afs/', has: [5] })).toHaveLength(2);        // duplicate removed
  expect(audioUrls(9, { server: 'https://s.test/afs/', has: [1, 2, 3] })[0]).toContain('server8');         // surah missing on that server
});

test('fetchSurahs loads from Al-Quran Cloud, keeps only the needed fields and caches the list', async () => {
  globalThis.fetch = vi.fn(async () => json({ code: 200, data: apiSurahs }));
  const list = await fetchSurahs();
  expect(String(fetch.mock.calls[0][0])).toBe('https://api.alquran.cloud/v1/surah');
  expect(list).toHaveLength(114);
  expect(list[0]).toEqual({ number: 1, name: 'س1', englishName: 'Surah 1', englishNameTranslation: 'T1', numberOfAyahs: 7, revelationType: 'Meccan' });
  expect(cachedSurahs()).toHaveLength(114);
  await fetchSurahs();
  expect(fetch).toHaveBeenCalledTimes(1);                                                                    // second call uses the saved copy
});

test('fetchSurahs reports a failing service', async () => {
  globalThis.fetch = vi.fn(async () => json({}, false, 503));
  await expect(fetchSurahs()).rejects.toThrow(/503/);
  globalThis.fetch = vi.fn(async () => json({ data: [] }));
  await expect(fetchSurahs()).rejects.toThrow(/surah list/);
});

const reciters = (extra = []) => ({ reciters: [
  { id: 1, name: 'Someone Else', moshaf: [{ server: 'https://other.test/x/', surah_total: 114, surah_list: '1,2' }] },
  { id: 123, name: 'Mishari Rashid Al-`Afasy', moshaf: [
    { server: 'https://small.test/afs', surah_total: 3, surah_list: '1,2,3' },
    { server: 'https://s.test/afs', surah_total: 114, surah_list: Array.from({ length: 114 }, (_, i) => i + 1).join(',') },
  ] }, ...extra,
] });

test('resolveAlafasy finds Alafasy by name, prefers the complete recitation and remembers it', async () => {
  globalThis.fetch = vi.fn(async () => json(reciters()));
  const r = await resolveAlafasy();
  expect(r.server).toBe('https://s.test/afs/');                                                              // trailing slash added
  expect(r.has).toHaveLength(114);
  expect(String(fetch.mock.calls[0][0])).toContain('reciter=123');
  await resolveAlafasy();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('resolveAlafasy falls back to the full catalogue, then to null (backup servers are used)', async () => {
  let n = 0;
  globalThis.fetch = vi.fn(async () => json(n++ === 0 ? { reciters: [{ id: 123, name: 'Another Reciter', moshaf: [] }] } : reciters()));
  expect((await resolveAlafasy()).server).toBe('https://s.test/afs/');
  expect(fetch).toHaveBeenCalledTimes(2);
  localStorage.clear();
  globalThis.fetch = vi.fn(async () => { throw new Error('offline'); });
  expect(await resolveAlafasy()).toBeNull();
});
