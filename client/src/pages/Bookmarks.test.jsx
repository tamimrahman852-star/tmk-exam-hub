import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Bookmarks from './Bookmarks.jsx';
import { addBookmarks, makeBookmark, toggleBookmark } from '../utils/bookmarks.js';
import { readList } from '../utils/store.js';

const q = (id, status) => ({ id, question_text: `Question ${id}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' }, chosen: 'A', correct_option: 'C', status, explanation: id === 'w1' ? 'Because reasons' : null });
const exam = { slug: 'chem', title: 'Chem Test' };
const view = () => render(<MemoryRouter><Bookmarks /></MemoryRouter>);

beforeEach(() => localStorage.clear());

test('toggleBookmark saves once, removes on the second call; wrong questions get the wrong tag', () => {
  expect(toggleBookmark(makeBookmark(q('w1', 'wrong'), exam))).toBe(true);
  expect(readList('tmk-bookmarks-v1')[0].tag).toBe('wrong');
  expect(toggleBookmark(makeBookmark(q('w1', 'wrong'), exam))).toBe(false);
  expect(readList('tmk-bookmarks-v1')).toHaveLength(0);
  expect(addBookmarks([makeBookmark(q('a', 'correct'), exam), makeBookmark(q('b', 'wrong'), exam)])).toBe(2);
  expect(addBookmarks([makeBookmark(q('a', 'correct'), exam)])).toBe(0);   // already saved
});

test('empty state invites the student to take an exam', () => {
  view();
  expect(screen.getByText(/nothing saved yet/i)).toBeInTheDocument();
});

test('lists saved questions with the right answer marked, filters, relabels and removes', async () => {
  const user = userEvent.setup();
  addBookmarks([makeBookmark(q('w1', 'wrong'), exam), makeBookmark(q('i1', 'correct'), exam)]);
  view();

  expect(screen.getByText('Question w1')).toBeInTheDocument();
  expect(screen.getByText('Question i1')).toBeInTheDocument();
  expect(screen.getByText(/Because reasons/)).toBeInTheDocument();
  expect(screen.getAllByText(/✓ Correct/).length).toBe(2);

  await user.click(screen.getByRole('button', { name: /^❌ Wrong \(1\)/ }));
  expect(screen.getByText('Question w1')).toBeInTheDocument();
  expect(screen.queryByText('Question i1')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /^All/ }));
  const card = screen.getByText('Question i1').closest('article');
  await user.click(within(card).getByRole('button', { name: /❌ Wrong/ }));      // relabel as wrong
  expect(screen.getByRole('button', { name: /^❌ Wrong \(2\)/ })).toBeInTheDocument();

  await user.click(within(card).getByRole('button', { name: /remove saved question/i }));
  expect(screen.queryByText('Question i1')).not.toBeInTheDocument();
  expect(readList('tmk-bookmarks-v1')).toHaveLength(1);
});
