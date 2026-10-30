import { api } from '../api.js';
import { dhakaDate } from './dates.js';

const key = (d) => `tmk-daily-${d}`;

export const fetchDailyQuiz = () => api('/api/daily-quiz');
export const submitDailyQuiz = (date, answers) => api('/api/daily-quiz/submit', { method: 'POST', body: { date, answers } });

// Once finished, today's result is kept so the widget shows it instead of the quiz again.
export function loadCompleted(date = dhakaDate()) {
  try { return JSON.parse(localStorage.getItem(key(date)) || 'null'); } catch { return null; }
}
export function saveCompleted(date, result) {
  try { localStorage.setItem(key(date), JSON.stringify(result)); } catch { /* ignore */ }
  window.dispatchEvent(new Event('tmk-storage'));
}
