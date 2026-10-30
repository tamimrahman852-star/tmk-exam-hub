import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import DailyQuizWidget from './DailyQuizWidget.jsx';
import { dhakaDate } from '../utils/dates.js';
import { readList, readObj } from '../utils/store.js';
import { dateKey } from '../utils/dates.js';

const DATE = dhakaDate();
const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Physics'];
const quiz = { date: DATE, source: 'ai', questions: subjects.map((s, i) => ({ id: `${DATE}-${i + 1}`, subject: s, question_text: `${s} question ${i + 1}`, option_a: 'opt a', option_b: 'opt b', option_c: 'opt c', option_d: 'opt d' })) };
// student picks A everywhere; correct answers: Q1 A, Q2 A, Q3 A (right), Q4 B, Q5 C (wrong)
const correct = ['A', 'A', 'A', 'B', 'C'];
const result = {
  date: DATE, source: 'ai', score: 3, total: 5, correct: 3, wrong: 2, unanswered: 0,
  breakdown: quiz.questions.map((q, i) => ({ id: q.id, subject: q.subject, question_text: q.question_text, options: { A: 'opt a', B: 'opt b', C: 'opt c', D: 'opt d' }, chosen: 'A', correct_option: correct[i], explanation: `Why ${i + 1}`, status: correct[i] === 'A' ? 'correct' : 'wrong' })),
};

let calls;
const view = () => render(<MemoryRouter><DailyQuizWidget /></MemoryRouter>);
beforeEach(() => {
  localStorage.clear(); calls = [];
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    calls.push({ url: String(url), body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (d) => ({ ok: true, status: 200, json: async () => d });
    return String(url).endsWith('/submit') ? ok(result) : ok(quiz);
  });
});

test('plays 5 questions with locked answers, then shows score, explanations and saves mistakes + streak', async () => {
  const user = userEvent.setup();
  view();
  expect(screen.getByText(/Daily Admission Quiz/)).toBeInTheDocument();
  await user.click(await screen.findByRole('button', { name: /start today/i }));

  for (let n = 1; n <= 5; n++) {
    expect(screen.getByText(`Question ${n} of 5`)).toBeInTheDocument();
    const next = screen.getByRole('button', { name: n < 5 ? /next/i : /submit/i });
    expect(next).toBeDisabled();                                  // must answer first
    const radios = screen.getAllByRole('radio');
    await user.click(screen.getByText('opt a'));                  // choose A
    expect(radios[0]).toBeChecked();
    expect(radios.every((r) => r.disabled)).toBe(true);           // locked
    await user.click(screen.getByText('opt c'));                  // cannot switch
    expect(radios[2]).not.toBeChecked();
    await user.click(next);
  }

  const submit = calls.find((c) => c.url.endsWith('/submit'));
  expect(submit.body.date).toBe(DATE);
  expect(Object.values(submit.body.answers)).toEqual(['A', 'A', 'A', 'A', 'A']);

  expect(await screen.findByText('3/5')).toBeInTheDocument();
  expect(screen.getByText(/3 correct/)).toBeInTheDocument();
  expect(screen.getByText(/2 wrong questions saved to your Mistake Book/)).toBeInTheDocument();
  expect(screen.getByText(/Why 4/)).toBeInTheDocument();          // explanations are shown right away

  expect(readList('tmk-mistakes-v1').map((m) => m.id).sort()).toEqual([`${DATE}-4`, `${DATE}-5`]);
  expect(readList('tmk-mistakes-v1')[0]).toMatchObject({ source: 'daily', origin: 'Daily Quiz' });
  expect(readObj('tmk-activity-v1')[dateKey()]).toEqual({ exams: 0, quizzes: 1, questions: 5 });
});

test('after finishing, today\'s result stays on screen and the quiz is not offered again', async () => {
  localStorage.setItem(`tmk-daily-${DATE}`, JSON.stringify(result));
  view();
  expect(screen.getByText('3/5')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /start today/i })).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByText(/Next quiz in/)).toBeInTheDocument();
});

test('shows a friendly error with a retry when the quiz cannot load', async () => {
  const user = userEvent.setup();
  let fail = true;
  globalThis.fetch = vi.fn(async () => (fail ? { ok: false, status: 503, json: async () => ({ error: "Today's quiz is not ready yet." }) } : { ok: true, status: 200, json: async () => quiz }));
  view();
  expect(await screen.findByRole('alert')).toHaveTextContent(/not ready yet/);
  fail = false;
  await user.click(screen.getByRole('button', { name: /try again/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /start today/i })).toBeInTheDocument());
});
