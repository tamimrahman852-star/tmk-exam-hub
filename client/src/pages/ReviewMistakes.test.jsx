import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ReviewMistakes from './ReviewMistakes.jsx';
import { recordMistakes } from '../utils/mistakes.js';
import { readList } from '../utils/store.js';

const q = (id, correct, extra = {}) => ({ id, question_text: `Question ${id}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' }, chosen: 'A', correct_option: correct, explanation: null, status: 'wrong', ...extra });
const list = () => readList('tmk-mistakes-v1');
const view = () => render(<MemoryRouter><ReviewMistakes /></MemoryRouter>);

beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockReturnValue(0.99); });  // keeps the revision order stable

test('empty state', () => {
  view();
  expect(screen.getByText(/your mistake book is empty/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /start revision/i })).not.toBeInTheDocument();
});

test('lists mistakes, filters by source and lets the student mark one as learned', async () => {
  const user = userEvent.setup();
  recordMistakes([q('e1', 'C', { explanation: 'Because reasons' })], { origin: 'Chem Test', source: 'exam', slug: 'chem' });
  recordMistakes([q('d1', 'B', { subject: 'Physics' })], { origin: 'Daily Quiz', source: 'daily' });
  view();
  expect(screen.getByText('Question e1')).toBeInTheDocument();
  expect(screen.getByText('Question d1')).toBeInTheDocument();
  expect(screen.getByText(/Because reasons/)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Daily quiz \(1\)/ }));
  expect(screen.queryByText('Question e1')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^All/ }));

  const card = screen.getByText('Question e1').closest('article');
  await user.click(within(card).getByRole('button', { name: /learned this/i }));
  expect(screen.queryByText('Question e1')).not.toBeInTheDocument();
  expect(list().map((m) => m.id)).toEqual(['d1']);
});

test('revision: a correct answer removes the question, a wrong one keeps it and counts again', async () => {
  const user = userEvent.setup();
  recordMistakes([q('w1', 'C'), q('w2', 'B')], { origin: 'Chem Test', source: 'exam', slug: 'chem' });   // list order: w2, w1
  view();
  await user.click(screen.getByRole('button', { name: /start revision \(2\)/i }));

  expect(screen.getByText('Question w2')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Option B/ }));                 // correct
  expect(screen.getByRole('status')).toHaveTextContent(/Correct! Removed from your Mistake Book/);
  expect(list().map((m) => m.id)).toEqual(['w1']);
  await user.click(screen.getByRole('button', { name: /next question/i }));

  expect(screen.getByText('Question w1')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Option A/ }));                 // wrong
  expect(screen.getByRole('status')).toHaveTextContent(/correct answer is C/);
  expect(list()[0]).toMatchObject({ id: 'w1', count: 2 });
  await user.click(screen.getByRole('button', { name: /finish/i }));

  expect(screen.getByText(/revision complete/i)).toBeInTheDocument();
  expect(screen.getByText('learned and removed').previousElementSibling).toHaveTextContent('1');
  expect(screen.getByText('still need practice').previousElementSibling).toHaveTextContent('1');
  await user.click(screen.getByRole('button', { name: /back to list/i }));
  expect(screen.getByText('Question w1')).toBeInTheDocument();
});

test('undo keeps a lucky guess in the Mistake Book', async () => {
  const user = userEvent.setup();
  recordMistakes([q('g1', 'C')], { origin: 'Daily Quiz', source: 'daily' });
  view();
  await user.click(screen.getByRole('button', { name: /start revision/i }));
  await user.click(screen.getByRole('button', { name: /Option C/ }));
  expect(list()).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: /undo/i }));
  expect(list()).toHaveLength(1);
});
