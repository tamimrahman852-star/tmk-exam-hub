import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import TakeExam from './TakeExam.jsx';

const exam = {
  id: 'e1', slug: 'chem', title: 'Chemistry Test', description: '', duration_minutes: 10,
  questions: [
    { id: 'q1', question_text: 'First question', option_a: 'a1', option_b: 'b1', option_c: 'c1', option_d: 'd1', marks: 1, negative_marks: 0.25 },
    { id: 'q2', question_text: 'Second question', option_a: 'a2', option_b: 'b2', option_c: 'c2', option_d: 'd2', marks: 1, negative_marks: 0.25 },
  ],
};
const result = {
  score: 0.75, totalMarks: 2, correct: 1, wrong: 1, unanswered: 0, total: 2, attemptId: '11111111-1111-4111-8111-111111111111', timeTaken: 42,
  breakdown: [
    { id: 'q1', question_text: 'First question', options: { A: 'a1', B: 'b1', C: 'c1', D: 'd1' }, chosen: 'B', correct_option: 'B', explanation: 'Creator explanation text', status: 'correct' },
    { id: 'q2', question_text: 'Second question', options: { A: 'a2', B: 'b2', C: 'c2', D: 'd2' }, chosen: 'A', correct_option: 'C', explanation: null, status: 'wrong' },
  ],
};
const board = { rows: [
  { rank: 1, name: 'Rahim', score: 2, totalMarks: 2, correct: 2, wrong: 0, skipped: 0, timeTaken: 90, isMe: false },
  { rank: 2, name: 'Karim', score: 0.75, totalMarks: 2, correct: 1, wrong: 1, skipped: 0, timeTaken: 42, isMe: true },
], myRank: 2, participants: 2, topScore: 2 };

let calls;
beforeEach(() => {
  calls = [];
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  localStorage.clear();
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (data) => ({ ok: true, status: 200, json: async () => data });
    const u = String(url);
    if (u.endsWith('/leaderboard') || u.includes('/leaderboard?')) return ok(board);
    if (u.endsWith('/submit')) return ok(result);
    if (u.endsWith('/explain')) return ok({ source: 'ai', text: 'AI wrote this explanation' });
    return ok(exam);
  });
});

const setup = () => render(
  <MemoryRouter initialEntries={['/exam/chem']}>
    <Routes><Route path="/exam/:slug" element={<TakeExam />} /></Routes>
  </MemoryRouter>
);

async function startExam(user) {
  await screen.findByText('Chemistry Test');
  await user.type(screen.getByPlaceholderText(/your name/i), 'Karim');
  await user.click(screen.getByRole('button', { name: /start exam/i }));
  await screen.findByText('First question');
}

test('a name is required before the exam starts', async () => {
  const user = userEvent.setup();
  setup();
  await screen.findByText('Chemistry Test');
  await user.click(screen.getByRole('button', { name: /start exam/i }));
  expect(screen.getByText(/enter your name/i)).toBeInTheDocument();
  expect(screen.queryByText('First question')).not.toBeInTheDocument();
});

test('an answer is locked: cannot be changed or cleared', async () => {
  const user = userEvent.setup();
  setup();
  await startExam(user);

  const q1 = screen.getByText('First question').closest('div[id^="q-"]');
  const radios = within(q1).getAllByRole('radio');
  await user.click(within(q1).getByText('b1'));           // choose B
  expect(radios[1]).toBeChecked();
  expect(radios.every((r) => r.disabled)).toBe(true);      // whole question is now locked

  await user.click(within(q1).getByText('d1'));            // try to switch to D
  expect(radios[1]).toBeChecked();
  expect(radios[3]).not.toBeChecked();
  expect(within(q1).queryByText(/clear/i)).not.toBeInTheDocument(); // no way to remove it
  expect(within(q1).getByText(/answer locked/i)).toBeInTheDocument();
});

test('submit sends only the first choice, then result, explanations and leaderboard show', async () => {
  const user = userEvent.setup();
  setup();
  await startExam(user);

  const q1 = screen.getByText('First question').closest('div[id^="q-"]');
  await user.click(within(q1).getByText('b1'));
  await user.click(within(q1).getByText('c1')); // ignored
  const q2 = screen.getByText('Second question').closest('div[id^="q-"]');
  await user.click(within(q2).getByText('a2'));

  await user.click(screen.getByRole('button', { name: /^submit exam/i }));
  await user.click(await screen.findByRole('button', { name: /^submit$/i }));

  await screen.findByText(/accuracy/i);
  const submit = calls.find((c) => c.url.endsWith('/submit'));
  expect(submit.method).toBe('POST');
  expect(submit.body.studentName).toBe('Karim');
  expect(submit.body.answers).toEqual({ q1: 'B', q2: 'A' });

  // leaderboard shows points, correct, wrong and skipped for each user
  await screen.findByText('Rahim');
  expect(screen.getAllByText('Karim').length).toBeGreaterThan(0);
  expect(screen.getByText(/point(s)? behind the leader/i)).toBeInTheDocument();

  // question with a stored explanation shows it without calling the AI endpoint
  const explainButtons = screen.getAllByRole('button', { name: /explanation/i });
  await user.click(explainButtons[0]);
  expect(await screen.findByText('Creator explanation text')).toBeInTheDocument();
  expect(calls.some((c) => c.url.endsWith('/explain'))).toBe(false);

  // question without one asks the server (database first, AI if missing)
  await user.click(explainButtons[1]);
  expect(await screen.findByText('AI wrote this explanation')).toBeInTheDocument();
  const explain = calls.find((c) => c.url.endsWith('/explain'));
  expect(explain.url).toContain('/questions/q2/explain');
  expect(explain.body.attemptId).toBe(result.attemptId);
});
