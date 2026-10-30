import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../utils/poster.js', () => ({ makePosterBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })) }));
import ResultShareCard from './ResultShareCard.jsx';
import { makePosterBlob } from '../utils/poster.js';

const result = { score: 7.5, totalMarks: 10, correct: 8, wrong: 1, unanswered: 1 };
const setup = async () => {
  render(<ResultShareCard result={result} title="Chemistry Test" url="https://tmk.test/exam/chem" />);
  await act(async () => {});            // let the poster image finish building
};
const setNav = (props) => Object.entries(props).forEach(([k, v]) => Object.defineProperty(navigator, k, { value: v, configurable: true, writable: true }));

afterEach(() => setNav({ share: undefined, canShare: undefined, clipboard: undefined }));

test('shows the score, total, accuracy and exam title on the card', async () => {
  await setup();
  expect(screen.getByText('Chemistry Test')).toBeInTheDocument();
  expect(screen.getByText('7.5')).toBeInTheDocument();
  expect(screen.getByText('of 10')).toBeInTheDocument();
  expect(screen.getByText('89% accuracy')).toBeInTheDocument();       // 8 correct of 9 answered
  expect(makePosterBlob).toHaveBeenCalledWith(expect.objectContaining({ title: 'Chemistry Test', score: 7.5, total: 10, accuracy: 89, correct: 8, wrong: 1, skipped: 1 }));
});

test('uses the native Web Share API with the poster image when the device supports it', async () => {
  const share = vi.fn().mockResolvedValue();
  setNav({ share, canShare: vi.fn(() => true) });
  await setup();
  fireEvent.click(screen.getByRole('button', { name: /share result/i }));
  await waitFor(() => expect(share).toHaveBeenCalled());
  const arg = share.mock.calls[0][0];
  expect(arg.files[0].name).toBe('tmk-result.png');
  expect(arg.text).toContain('7.5/10');
  expect(arg.text).toContain('https://tmk.test/exam/chem');
});

test('falls back to copying the text when sharing is not available', async () => {
  const writeText = vi.fn().mockResolvedValue();
  setNav({ share: undefined, canShare: undefined, clipboard: { writeText } });
  await setup();
  fireEvent.click(screen.getByRole('button', { name: /share result/i }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Can you beat me? https://tmk.test/exam/chem')));
  expect(await screen.findByText(/copied/i)).toBeInTheDocument();
});

test('closing the share sheet is not treated as an error', async () => {
  const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' });
  const writeText = vi.fn();
  setNav({ share: vi.fn().mockRejectedValue(abort), canShare: vi.fn(() => true), clipboard: { writeText } });
  await setup();
  fireEvent.click(screen.getByRole('button', { name: /share result/i }));
  await act(async () => {});
  expect(writeText).not.toHaveBeenCalled();
});
