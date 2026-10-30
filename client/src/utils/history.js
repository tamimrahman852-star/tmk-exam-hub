import { readList, writeList, useStoredList } from './store.js';

const KEY = 'tmk-history-v1';

export const useHistory = () => useStoredList(KEY);

// Called once after every submitted exam.
export function saveAttempt(r, exam) {
  const list = readList(KEY).filter((h) => h.attemptId !== r.attemptId);
  list.push({
    attemptId: r.attemptId, slug: exam.slug, title: exam.title,
    score: r.score, totalMarks: r.totalMarks, correct: r.correct, wrong: r.wrong,
    unanswered: r.unanswered, total: r.total, timeTaken: r.timeTaken ?? null,
    at: new Date().toISOString(),
  });
  writeList(KEY, list.slice(-200));
}

const pct = (h) => (h.totalMarks > 0 ? Math.max(0, (h.score / h.totalMarks) * 100) : 0);

export function computeStats(history) {
  const n = history.length;
  if (!n) return { n: 0 };
  const sum = (f) => history.reduce((s, h) => s + f(h), 0);
  const correct = sum((h) => h.correct), wrong = sum((h) => h.wrong), skipped = sum((h) => h.unanswered);
  const attempted = correct + wrong;
  return {
    n,
    avg: sum(pct) / n,
    best: Math.max(...history.map(pct)),
    accuracy: attempted ? (correct / attempted) * 100 : 0,
    correct, wrong, skipped,
    recent: history.slice(-7).map((h) => ({ title: h.title, pct: pct(h) })),
  };
}
