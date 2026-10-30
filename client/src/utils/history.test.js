import { computeStats, saveAttempt } from './history.js';
import { readList } from './store.js';

const attempt = (id, score, total, correct, wrong, skipped) => ({ attemptId: id, score, totalMarks: total, correct, wrong, unanswered: skipped, total: correct + wrong + skipped, timeTaken: 60 });

beforeEach(() => localStorage.clear());

test('saveAttempt stores one entry per attempt (no duplicates)', () => {
  saveAttempt(attempt('a1', 5, 10, 5, 3, 2), { slug: 's', title: 'T' });
  saveAttempt(attempt('a1', 5, 10, 5, 3, 2), { slug: 's', title: 'T' });
  saveAttempt(attempt('a2', 10, 10, 10, 0, 0), { slug: 's', title: 'T' });
  expect(readList('tmk-history-v1').map((h) => h.attemptId)).toEqual(['a1', 'a2']);
});

test('computeStats: exams taken, average, best and overall accuracy', () => {
  const h = [
    { score: 5, totalMarks: 10, correct: 5, wrong: 3, unanswered: 2, title: 'A' },
    { score: 10, totalMarks: 10, correct: 10, wrong: 0, unanswered: 0, title: 'B' },
  ];
  const s = computeStats(h);
  expect(s.n).toBe(2);
  expect(s.avg).toBe(75);
  expect(s.best).toBe(100);
  expect(Math.round(s.accuracy)).toBe(83);         // 15 correct of 18 answered
  expect(s.skipped).toBe(2);
  expect(s.recent).toHaveLength(2);
});

test('negative scores never pull the average below zero and empty history is handled', () => {
  expect(computeStats([{ score: -2, totalMarks: 10, correct: 0, wrong: 8, unanswered: 0, title: 'x' }]).avg).toBe(0);
  expect(computeStats([])).toEqual({ n: 0 });
});
