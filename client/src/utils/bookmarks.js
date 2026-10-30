import { readList, writeList, useStoredList } from './store.js';

const KEY = 'tmk-bookmarks-v1';

export const useBookmarks = () => useStoredList(KEY);

// q = one item of the result breakdown, exam = { slug, title }
export const makeBookmark = (q, exam) => ({
  id: q.id, slug: exam.slug, examTitle: exam.title,
  question_text: q.question_text, options: q.options,
  correct_option: q.correct_option, chosen: q.chosen, status: q.status,
  explanation: q.explanation || '',
  tag: q.status === 'wrong' ? 'wrong' : 'important',
  savedAt: new Date().toISOString(),
});

// returns true when the question is now saved, false when it was removed
export function toggleBookmark(item) {
  const list = readList(KEY);
  const i = list.findIndex((b) => b.id === item.id);
  if (i >= 0) list.splice(i, 1); else list.unshift(item);
  writeList(KEY, list);
  return i < 0;
}

export function addBookmarks(items) {
  const list = readList(KEY);
  const have = new Set(list.map((b) => b.id));
  const fresh = items.filter((i) => !have.has(i.id));
  if (fresh.length) writeList(KEY, [...fresh, ...list]);
  return fresh.length;
}

export const removeBookmark = (id) => writeList(KEY, readList(KEY).filter((b) => b.id !== id));
export const setBookmarkTag = (id, tag) => writeList(KEY, readList(KEY).map((b) => (b.id === id ? { ...b, tag } : b)));
