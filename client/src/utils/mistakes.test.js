import { bumpMistake, recordMistakes, removeMistake, restoreMistake } from './mistakes.js';
import { readList } from './store.js';

const q = (id, status, extra = {}) => ({ id, question_text: `Question ${id}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' }, chosen: 'A', correct_option: 'C', explanation: null, status, ...extra });
const list = () => readList('tmk-mistakes-v1');

beforeEach(() => localStorage.clear());

test('only wrong answers are collected, with where they came from', () => {
  const added = recordMistakes([q('1', 'wrong'), q('2', 'correct'), q('3', 'unanswered'), q('4', 'wrong', { subject: 'Physics' })], { origin: 'Daily Quiz', source: 'daily' });
  expect(added).toBe(2);
  expect(list().map((m) => m.id).sort()).toEqual(['1', '4']);
  expect(list().find((m) => m.id === '4')).toMatchObject({ source: 'daily', origin: 'Daily Quiz', subject: 'Physics', count: 1, correct_option: 'C' });
});

test('missing the same question again raises its count instead of duplicating it', () => {
  recordMistakes([q('1', 'wrong')], { origin: 'Exam A', source: 'exam', slug: 'a' });
  const again = recordMistakes([q('1', 'wrong', { chosen: 'B' })], { origin: 'Exam A', source: 'exam', slug: 'a' });
  expect(again).toBe(0);
  expect(list()).toHaveLength(1);
  expect(list()[0]).toMatchObject({ count: 2, chosen: 'B', slug: 'a' });
});

test('a correct answer does not remove it by itself; remove, restore and bump work', () => {
  recordMistakes([q('1', 'wrong')], { origin: 'Exam A', source: 'exam' });
  recordMistakes([q('1', 'correct')], { origin: 'Exam A', source: 'exam' });
  expect(list()).toHaveLength(1);
  const item = list()[0];
  removeMistake('1');
  expect(list()).toHaveLength(0);
  restoreMistake(item);
  restoreMistake(item);                       // no duplicate
  expect(list()).toHaveLength(1);
  bumpMistake('1', 'D');
  expect(list()[0]).toMatchObject({ chosen: 'D', count: 2 });
});
