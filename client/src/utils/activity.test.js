import { computeStreak, getGoal, recordActivity, setGoal } from './activity.js';
import { addDays, dateKey } from './dates.js';
import { readObj } from './store.js';

const day = (...keys) => Object.fromEntries(keys.map((k) => [k, { exams: 1, quizzes: 0, questions: 10 }]));
const T = '2026-10-31';

beforeEach(() => localStorage.clear());

test('streak counts consecutive days ending today', () => {
  const s = computeStreak(day(T, addDays(T, -1), addDays(T, -2), addDays(T, -3), addDays(T, -4)), T);
  expect(s).toMatchObject({ current: 5, longest: 5, doneToday: true, alive: true, atRisk: false });
});

test('a missed day breaks the streak, but yesterday still keeps it alive until tonight', () => {
  const alive = computeStreak(day(addDays(T, -1), addDays(T, -2)), T);
  expect(alive).toMatchObject({ current: 2, doneToday: false, atRisk: true });
  const broken = computeStreak(day(addDays(T, -2), addDays(T, -3)), T);
  expect(broken).toMatchObject({ current: 0, alive: false, longest: 2 });
});

test('longest streak is remembered after the current one breaks', () => {
  const s = computeStreak(day('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', T), T);
  expect(s.current).toBe(1);
  expect(s.longest).toBe(4);
});

test('the week strip shows the last 7 days and marks today', () => {
  const s = computeStreak(day(T, addDays(T, -2)), T);
  expect(s.week).toHaveLength(7);
  expect(s.week.at(-1)).toMatchObject({ date: T, today: true, done: true });
  expect(s.week.filter((d) => d.done)).toHaveLength(2);
});

test('exams and quizzes both count, and questions add up', () => {
  recordActivity({ type: 'exam', questions: 20 });
  recordActivity({ type: 'quiz', questions: 5 });
  const today = readObj('tmk-activity-v1')[dateKey()];
  expect(today).toEqual({ exams: 1, quizzes: 1, questions: 25 });
  expect(computeStreak(readObj('tmk-activity-v1')).doneToday).toBe(true);
});

test('daily goal defaults to 10 and can be changed', () => {
  expect(getGoal()).toBe(10);
  setGoal(20);
  expect(getGoal()).toBe(20);
});
