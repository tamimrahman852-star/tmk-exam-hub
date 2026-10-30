import { readObj, writeObj, useStoredObject } from './store.js';
import { addDays, dateKey } from './dates.js';

const KEY = 'tmk-activity-v1';
const GOAL_KEY = 'tmk-daily-goal';
export const GOALS = [5, 10, 20, 30];

export const useActivity = () => useStoredObject(KEY);

// Call after every submitted exam or daily quiz. `questions` = how many questions were answered.
export function recordActivity({ type, questions = 0 }) {
  const all = readObj(KEY);
  const day = dateKey();
  const cur = all[day] || { exams: 0, quizzes: 0, questions: 0 };
  if (type === 'exam') cur.exams += 1; else cur.quizzes += 1;
  cur.questions += questions;
  all[day] = cur;
  // keep about a year of history
  const keep = Object.keys(all).sort().slice(-400);
  writeObj(KEY, Object.fromEntries(keep.map((k) => [k, all[k]])));
}

export const getGoal = () => {
  const g = Number(localStorage.getItem(GOAL_KEY));
  return GOALS.includes(g) ? g : 10;
};
export const setGoal = (g) => { try { localStorage.setItem(GOAL_KEY, String(g)); } catch { /* ignore */ } window.dispatchEvent(new Event('tmk-storage')); };

const done = (all, day) => ((all[day]?.exams || 0) + (all[day]?.quizzes || 0)) > 0;

// A streak = consecutive days with at least one exam or quiz. It stays alive until the end of the next day.
export function computeStreak(all, today = dateKey()) {
  let cursor = done(all, today) ? today : addDays(today, -1);
  let current = 0;
  while (done(all, cursor)) { current += 1; cursor = addDays(cursor, -1); }

  const days = Object.keys(all).filter((d) => done(all, d)).sort();
  let longest = 0, run = 0, prev = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    const [y, m, d] = date.split('-').map(Number);
    return { date, label: 'SMTWTFS'[new Date(y, m - 1, d).getDay()], done: done(all, date), today: date === today };
  });

  return {
    current, longest: Math.max(longest, current), doneToday: done(all, today),
    alive: current > 0, atRisk: current > 0 && !done(all, today),
    questionsToday: all[today]?.questions || 0, week,
  };
}
