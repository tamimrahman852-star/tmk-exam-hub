import { render, screen } from '@testing-library/react';
import AnalyticsWidget from './AnalyticsWidget.jsx';

beforeEach(() => localStorage.clear());

test('shows an inviting empty state before the first exam', () => {
  render(<AnalyticsWidget />);
  expect(screen.getByText(/performance dashboard/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /take an exam/i })).toBeInTheDocument();
});

test('shows exams taken, average score, best score and accuracy from saved attempts', () => {
  localStorage.setItem('tmk-history-v1', JSON.stringify([
    { attemptId: '1', title: 'A', score: 5, totalMarks: 10, correct: 5, wrong: 3, unanswered: 2 },
    { attemptId: '2', title: 'B', score: 10, totalMarks: 10, correct: 10, wrong: 0, unanswered: 0 },
  ]));
  render(<AnalyticsWidget />);
  expect(screen.getByText('Exams taken').nextElementSibling).toHaveTextContent('2');
  expect(screen.getByText('Average score').nextElementSibling).toHaveTextContent('75%');
  expect(screen.getByText('Best score').nextElementSibling).toHaveTextContent('100%');
  expect(screen.getByText('83%')).toBeInTheDocument();       // accuracy meter
  expect(screen.getByText(/15 correct/)).toBeInTheDocument();
});
