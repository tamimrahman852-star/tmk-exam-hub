// Dates are exam days as announced; the countdown runs to 12:00 AM (Dhaka time, UTC+6) on that day.
// Edit this list to add exams or fix a date: the widget updates automatically.
export const EXAMS = [
  { id: 'du-science', tab: 'DU Science', title: 'Dhaka University · Science Unit', date: '2026-12-12' },
  { id: 'du-arts', tab: 'DU Arts', title: 'Dhaka University · Arts / Social Science Unit', date: '2026-12-19' },
  { id: 'du-business', tab: 'DU Business', title: 'Dhaka University · Business Studies Unit', date: '2026-12-26' },
  { id: 'mbbs', tab: 'MBBS', title: 'Medical MBBS Admission Test', date: '2026-12-04' },
  { id: 'buet', tab: 'BUET', title: 'BUET Admission Test', date: '2027-01-16' },
];

export const targetMs = (date) => new Date(`${date}T00:00:00+06:00`).getTime();

export function timeLeft(target, now) {
  const diff = target - now;
  if (diff <= 0) return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const s = Math.floor(diff / 1000);
  return { done: false, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

export const formatExamDate = (date) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' })
    .format(new Date(targetMs(date)));

// The soonest exam that has not happened yet (or the first one if all are past).
export function nextExam(now = Date.now()) {
  const upcoming = EXAMS.filter((e) => targetMs(e.date) > now).sort((a, b) => targetMs(a.date) - targetMs(b.date));
  return (upcoming[0] || EXAMS[0]).id;
}
