import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import QuranHub from './QuranHub.jsx';

const NAMES = { 1: ['Al-Faatiha', 'The Opening', 'Meccan'], 2: ['Al-Baqara', 'The Cow', 'Medinan'], 36: ['Ya-Seen', 'Ya Sin', 'Meccan'] };
const surahs = Array.from({ length: 114 }, (_, i) => {
  const n = i + 1, [en, tr, type] = NAMES[n] || [`Surah-${n}`, `Meaning ${n}`, n % 2 ? 'Meccan' : 'Medinan'];
  return { number: n, name: `سورة ${n}`, englishName: en, englishNameTranslation: tr, numberOfAyahs: 7, revelationType: type };
});
const reciters = { reciters: [{ id: 123, name: 'Mishary Rashid Alafasy', moshaf: [{ server: 'https://s.test/afs/', surah_total: 114, surah_list: surahs.map((s) => s.number).join(',') }] }] };

let audios;
class FakeAudio {
  constructor() { this.src = ''; this.currentTime = 0; this.duration = NaN; this.ended = false; this.pauses = 0; audios.push(this); }
  play() { return Promise.resolve(); }
  pause() { this.pauses += 1; }
}
const json = (d) => ({ ok: true, status: 200, json: async () => d });
const card = (n) => screen.getByRole('button', { name: new RegExp(`Surah ${n}:`) });
const player = () => screen.getByRole('region', { name: /audio player/i });
const fire = (name) => act(() => { audios[0][name](); });

async function open() {
  render(<QuranHub />);
  await screen.findByRole('button', { name: /Surah 1: Al-Faatiha/ });
  await waitFor(() => expect(localStorage.getItem('tmk-afs-v1')).toBeTruthy());     // audio server resolved
}

beforeEach(() => {
  audios = []; localStorage.clear();
  globalThis.Audio = FakeAudio;
  globalThis.fetch = vi.fn(async (url) => (String(url).includes('alquran.cloud') ? json({ data: surahs }) : json(reciters)));
});

test('shows all 114 surahs with number, English name, translation and Arabic name', async () => {
  await open();
  expect(screen.getAllByRole('button', { name: /^(Play|Pause) Surah \d+:/ })).toHaveLength(114);
  const c = card(2);
  expect(within(c).getByText('Al-Baqara')).toBeInTheDocument();
  expect(within(c).getByText('The Cow')).toBeInTheDocument();
  expect(within(c).getByText('سورة 2')).toBeInTheDocument();
  expect(within(c).getByText('2')).toBeInTheDocument();
  expect(String(fetch.mock.calls.find((c) => String(c[0]).includes('alquran'))[0])).toBe('https://api.alquran.cloud/v1/surah');
  expect(fetch.mock.calls.some((c) => String(c[0]).includes('mp3quran.net/api/v3/reciters'))).toBe(true);
});

test('search by name, meaning or number, and the Makki / Madani filter', async () => {
  const user = userEvent.setup();
  await open();
  const search = screen.getByLabelText(/search surahs/i);
  await user.type(search, 'baqara');
  expect(screen.getAllByRole('button', { name: /^Play Surah/ })).toHaveLength(1);
  await user.clear(search); await user.type(search, 'the cow');
  expect(card(2)).toBeInTheDocument();
  await user.clear(search); await user.type(search, '36');
  expect(screen.getAllByRole('button', { name: /^Play Surah/ })).toHaveLength(1);
  expect(card(36)).toBeInTheDocument();
  await user.clear(search); await user.type(search, 'zzzz');
  expect(screen.getByText(/No surah matches/)).toBeInTheDocument();
  await user.clear(search);
  await user.click(screen.getByRole('button', { name: /^Madani/ }));
  expect(screen.getAllByRole('button', { name: /^Play Surah/ }).length).toBe(56);   // 57 even numbers, minus Ya-Seen which is Makki
  expect(screen.queryByRole('button', { name: /Surah 1:/ })).not.toBeInTheDocument();
});

test('selecting a surah plays Alafasy from MP3Quran; pause, resume and switching surahs work', async () => {
  const user = userEvent.setup();
  await open();
  expect(screen.queryByRole('region', { name: /audio player/i })).not.toBeInTheDocument();

  await user.click(card(2));
  expect(audios[0].src).toBe('https://s.test/afs/002.mp3');
  expect(within(player()).getByText('Al-Baqara', { exact: false })).toBeInTheDocument();
  expect(within(player()).getByText(/Mishary Rashid Alafasy/)).toBeInTheDocument();
  fire('onplaying');
  expect(within(player()).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  expect(card(2)).toHaveAccessibleName(/^Pause Surah 2/);

  await user.click(within(player()).getByRole('button', { name: 'Pause' }));
  expect(audios[0].pauses).toBeGreaterThan(0);
  expect(within(player()).getByRole('button', { name: 'Play' })).toBeInTheDocument();

  await user.click(card(36));                                                 // switch to another surah
  expect(audios[0].src).toBe('https://s.test/afs/036.mp3');
  expect(within(player()).getByText('Ya-Seen', { exact: false })).toBeInTheDocument();
  expect(audios).toHaveLength(1);                                             // one audio element is reused
});

test('previous / next surah buttons and automatic next when a surah ends', async () => {
  const user = userEvent.setup();
  await open();
  await user.click(card(36));
  await user.click(within(player()).getByRole('button', { name: /^next surah$/i }));
  expect(audios[0].src).toContain('037.mp3');
  await user.click(within(player()).getByRole('button', { name: /^previous surah$/i }));
  expect(audios[0].src).toContain('036.mp3');

  fire('onended');                                                            // auto-next is on by default
  expect(audios[0].src).toContain('037.mp3');

  await user.click(within(player()).getByRole('button', { name: /play the next surah automatically/i }));   // turn off
  fire('onended');
  expect(audios[0].src).toContain('037.mp3');                                 // stays
  expect(within(player()).getByRole('button', { name: 'Play' })).toBeInTheDocument();
});

test('repeat replays the same surah, first surah has no previous and the last has no next', async () => {
  const user = userEvent.setup();
  await open();
  await user.click(card(1));
  expect(within(player()).getByRole('button', { name: /^previous surah$/i })).toBeDisabled();
  await user.click(within(player()).getByRole('button', { name: /repeat this surah/i }));
  audios[0].currentTime = 55;
  fire('onended');
  expect(audios[0].src).toContain('001.mp3');
  expect(audios[0].currentTime).toBe(0);

  await user.click(screen.getByLabelText(/search surahs/i)); await user.keyboard('114');
  await user.click(card(114));
  expect(within(player()).getByRole('button', { name: /^next surah$/i })).toBeDisabled();
});

test('seek bar shows the time and moves the audio position', async () => {
  const user = userEvent.setup();
  await open();
  await user.click(card(1));
  audios[0].duration = 100; fire('onloadedmetadata');
  expect(within(player()).getByText('1:40')).toBeInTheDocument();
  fireEvent.change(within(player()).getByLabelText('Seek'), { target: { value: '40' } });
  expect(audios[0].currentTime).toBe(40);
  expect(within(player()).getByText('0:40')).toBeInTheDocument();
});

test('if one audio server fails the next one is tried, then a friendly error with Retry', async () => {
  const user = userEvent.setup();
  await open();
  await user.click(card(2));
  expect(audios[0].src).toBe('https://s.test/afs/002.mp3');
  fire('onerror');
  expect(audios[0].src).toBe('https://server8.mp3quran.net/afs/002.mp3');
  fire('onerror');
  expect(audios[0].src).toContain('download.quranicaudio.com');
  fire('onerror');
  expect(await screen.findByText(/could not play this surah/i)).toBeInTheDocument();
  await user.click(within(player()).getByRole('button', { name: /retry/i }));
  expect(audios[0].src).toBe('https://s.test/afs/002.mp3');
});

test('shows an error with Try again when the surah list cannot be loaded', async () => {
  const user = userEvent.setup();
  let fail = true;
  globalThis.fetch = vi.fn(async (url) => {
    if (String(url).includes('alquran.cloud')) { if (fail) throw new Error('Network down'); return json({ data: surahs }); }
    return json(reciters);
  });
  render(<QuranHub />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/network down/i);
  fail = false;
  await user.click(screen.getByRole('button', { name: /try again/i }));
  expect(await screen.findByRole('button', { name: /Surah 1: Al-Faatiha/ })).toBeInTheDocument();
});

test('uses the saved surah list without calling the API again', async () => {
  await open();
  const calls = fetch.mock.calls.filter((c) => String(c[0]).includes('alquran')).length;
  expect(calls).toBe(1);
  render(<QuranHub />);
  expect((await screen.findAllByRole('button', { name: /Surah 1: Al-Faatiha/ })).length).toBe(2);
  expect(fetch.mock.calls.filter((c) => String(c[0]).includes('alquran')).length).toBe(1);
});

test('the player bar is attached to <body> so it stays at the bottom of the screen on a long page', async () => {
  const user = userEvent.setup();
  const { container } = render(<QuranHub />);
  await screen.findByRole('button', { name: /Surah 1: Al-Faatiha/ });
  await user.click(card(1));
  const bar = player();
  expect(container.contains(bar)).toBe(false);
  expect(bar.parentElement.parentElement).toBe(document.body);
  expect(bar.parentElement.className).toMatch(/fixed inset-x-0 bottom-0/);
});
