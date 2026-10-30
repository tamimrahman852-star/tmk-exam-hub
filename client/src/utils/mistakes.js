import { readList, writeList, useStoredList } from './store.js';

const KEY = 'tmk-mistakes-v1';

export const useMistakes = () => useStoredList(KEY);

// Called after every exam and daily quiz: every wrong answer lands in the Mistake Book automatically.
// `breakdown` items: { id, question_text, options, chosen, correct_option, explanation, status, subject? }
export function recordMistakes(breakdown, { origin, source, slug = null }) {
  const list = readList(KEY);
  const now = new Date().toISOString();
  let added = 0;
  for (const q of breakdown) {
    if (q.status !== 'wrong') continue;
    const i = list.findIndex((m) => m.id === q.id);
    if (i >= 0) {
      list[i] = { ...list[i], chosen: q.chosen, count: (list[i].count || 1) + 1, lastWrongAt: now, explanation: q.explanation || list[i].explanation };
    } else {
      added += 1;
      list.unshift({
        id: q.id, source, origin, slug, subject: q.subject || '',
        question_text: q.question_text, options: q.options, correct_option: q.correct_option,
        chosen: q.chosen, explanation: q.explanation || '', count: 1, addedAt: now, lastWrongAt: now,
      });
    }
  }
  if (added || breakdown.some((q) => q.status === 'wrong')) writeList(KEY, list.slice(0, 500));
  return added;
}

export const removeMistake = (id) => writeList(KEY, readList(KEY).filter((m) => m.id !== id));
export const restoreMistake = (item) => { const l = readList(KEY); if (!l.some((m) => m.id === item.id)) writeList(KEY, [item, ...l]); };
export const bumpMistake = (id, chosen) =>
  writeList(KEY, readList(KEY).map((m) => (m.id === id ? { ...m, chosen, count: (m.count || 1) + 1, lastWrongAt: new Date().toISOString() } : m)));
