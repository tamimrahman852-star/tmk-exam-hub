import { EXAMS, nextExam, targetMs, timeLeft } from './countdown.js';

test('the five exams are configured with the announced dates', () => {
  const byId = Object.fromEntries(EXAMS.map((e) => [e.id, e.date]));
  expect(byId).toEqual({
    'du-science': '2026-12-12', 'du-arts': '2026-12-19', 'du-business': '2026-12-26',
    mbbs: '2026-12-04', buet: '2027-01-16',
  });
});

test('targets are midnight Dhaka time (UTC+6)', () => {
  expect(new Date(targetMs('2026-12-12')).toISOString()).toBe('2026-12-11T18:00:00.000Z');
});

test('timeLeft splits the gap into days, hours, minutes and seconds', () => {
  const t = 1_000_000_000_000;
  expect(timeLeft(t + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000, t)).toEqual({ done: false, days: 2, hours: 3, minutes: 4, seconds: 5 });
  expect(timeLeft(t, t).done).toBe(true);
  expect(timeLeft(t - 5000, t)).toEqual({ done: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('nextExam picks the soonest upcoming exam', () => {
  expect(nextExam(new Date('2026-10-30T12:00:00+06:00').getTime())).toBe('mbbs');
  expect(nextExam(new Date('2026-12-10T12:00:00+06:00').getTime())).toBe('du-science');
  expect(nextExam(new Date('2027-01-01T12:00:00+06:00').getTime())).toBe('buet');
});
