import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StreakWidget from './StreakWidget.jsx';
import { addDays, dateKey } from '../utils/dates.js';

const T = dateKey();
const seed = (entries) => localStorage.setItem('tmk-activity-v1', JSON.stringify(Object.fromEntries(entries.map(([d, q]) => [d, { exams: 1, quizzes: 0, questions: q }]))));
const view = () => render(<MemoryRouter><StreakWidget /></MemoryRouter>);

beforeEach(() => localStorage.clear());

test('shows the streak count and a safe-for-today message', () => {
  seed([[T, 7], [addDays(T, -1), 10], [addDays(T, -2), 10], [addDays(T, -3), 10], [addDays(T, -4), 10]]);
  view();
  expect(screen.getByText('🔥 5 Days Streak')).toBeInTheDocument();
  expect(screen.getByText(/Today is done/)).toBeInTheDocument();
  expect(screen.getByText(/7 \/ 10 questions answered today/)).toBeInTheDocument();
});

test('warns when the streak is at risk today', () => {
  seed([[addDays(T, -1), 10], [addDays(T, -2), 10]]);
  view();
  expect(screen.getByText('🔥 2 Days Streak')).toBeInTheDocument();
  expect(screen.getByText(/Finish 1 exam or quiz today to keep your streak/)).toBeInTheDocument();
});

test('starts empty for a new student and lets them change the daily goal', () => {
  view();
  expect(screen.getByText('No streak yet')).toBeInTheDocument();
  expect(screen.getByText(/0 \/ 10 questions/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/daily goal in questions/i), { target: { value: '20' } });
  expect(screen.getByText(/0 \/ 20 questions/)).toBeInTheDocument();
});

test('celebrates when the goal is reached', () => {
  seed([[T, 12]]);
  view();
  expect(screen.getByText(/Daily goal reached/)).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
});
