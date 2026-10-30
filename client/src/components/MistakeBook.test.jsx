import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MistakeBook from './MistakeBook.jsx';
import { recordMistakes } from '../utils/mistakes.js';

const q = (id) => ({ id, question_text: `Question ${id}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' }, chosen: 'A', correct_option: 'C', status: 'wrong' });
const view = () => render(<MemoryRouter><MistakeBook /></MemoryRouter>);

beforeEach(() => localStorage.clear());

test('empty state explains that mistakes are collected automatically', () => {
  view();
  expect(screen.getByText(/no mistakes saved yet/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /review mistakes/i })).toHaveAttribute('href', '/mistakes');
});

test('shows the count, the sources and a Review Mistakes button', () => {
  recordMistakes([q('1'), q('2')], { origin: 'Chem Test', source: 'exam', slug: 'chem' });
  recordMistakes([q('3')], { origin: 'Daily Quiz', source: 'daily' });
  recordMistakes([q('1')], { origin: 'Chem Test', source: 'exam', slug: 'chem' });      // missed again
  view();
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByText(/2 from exams/)).toBeInTheDocument();
  expect(screen.getByText(/1 from daily quiz/)).toBeInTheDocument();
  expect(screen.getByText(/1 missed more than once/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /review mistakes \(3\)/i })).toHaveAttribute('href', '/mistakes');
});
