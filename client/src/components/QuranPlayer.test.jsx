import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import QuranPlayer from './QuranPlayer.jsx';

let audios;
class FakeAudio {
  constructor() { this.src = ''; this.currentTime = 0; this.duration = 10; this.plays = []; audios.push(this); }
  play() { this.plays.push(this.src); return Promise.resolve(); }
  pause() {}
}

const ayahReply = (n) => ({
  ok: true, status: 200,
  json: async () => ({ code: 200, status: 'OK', data: [
    { number: n, audio: `https://cdn.test/${n}.mp3`, audioSecondary: [`https://cdn2.test/${n}.mp3`], edition: { identifier: 'ar.alafasy', format: 'audio' } },
    { number: n, text: `বাংলা অনুবাদ ${n}`, edition: { identifier: 'bn.bengali', format: 'text', englishName: 'Muhiuddin Khan' } },
  ] }),
});

beforeEach(() => {
  audios = [];
  localStorage.clear();
  globalThis.Audio = FakeAudio;
  globalThis.fetch = vi.fn(async (url) => ayahReply(Number(String(url).match(/ayah\/(\d+)\//)[1])));
});

// distinct ayah numbers per test so the in-memory cache never leaks between tests
test('Listen loads the recitation for the right ayah and plays it', async () => {
  const user = userEvent.setup();
  render(<QuranPlayer ayahs={[2462]} firstAyah={114} partial />);
  expect(fetch).not.toHaveBeenCalled();                       // nothing is fetched until the user asks
  await user.click(screen.getByRole('button', { name: /listen to the recitation/i }));
  await waitFor(() => expect(audios[0].plays).toContain('https://cdn.test/2462.mp3'));
  expect(String(fetch.mock.calls[0][0])).toContain('/ayah/2462/editions/ar.alafasy,bn.bengali');
  expect(screen.getByText(/plays the complete ayah/i)).toBeInTheDocument();
});

test('several ayahs play one after another, and repeat loops back', async () => {
  const user = userEvent.setup();
  render(<QuranPlayer ayahs={[2200, 2201]} firstAyah={25} />);
  await user.click(screen.getByRole('button', { name: /listen to the recitation/i }));
  await waitFor(() => expect(audios[0].plays).toContain('https://cdn.test/2200.mp3'));
  audios[0].onended();                                          // first ayah finished
  expect(audios[0].plays.at(-1)).toBe('https://cdn.test/2201.mp3');
  await user.click(screen.getByRole('button', { name: /repeat/i }));
  audios[0].onended();                                          // last ayah finished, repeat is on
  expect(audios[0].plays.at(-1)).toBe('https://cdn.test/2200.mp3');
});

test('Bangla translation is hidden until asked, then shown for each ayah', async () => {
  const user = userEvent.setup();
  render(<QuranPlayer ayahs={[3300, 3301]} firstAyah={5} />);
  expect(screen.queryByText('বাংলা অনুবাদ 3300')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /বাংলা অনুবাদ/ }));
  expect(await screen.findByText('বাংলা অনুবাদ 3300')).toBeInTheDocument();
  expect(screen.getByText('বাংলা অনুবাদ 3301')).toBeInTheDocument();
  expect(screen.getByText(/Muhiuddin Khan/)).toBeInTheDocument();
});

test('shows a friendly error when the Quran service is unreachable', async () => {
  const user = userEvent.setup();
  globalThis.fetch = vi.fn(async () => { throw new Error('offline'); });
  render(<QuranPlayer ayahs={[4400]} firstAyah={1} />);
  await user.click(screen.getByRole('button', { name: /listen to the recitation/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load the recitation/i);
});
