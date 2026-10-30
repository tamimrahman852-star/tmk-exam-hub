const pad = (n) => String(n).padStart(2, '0');

// YYYY-MM-DD in the student's own time zone (used for streaks).
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
}

// Today's date in Bangladesh (UTC+6): the daily quiz changes at midnight Dhaka time.
export const dhakaDate = (t = Date.now()) => new Date(t + 6 * 3600 * 1000).toISOString().slice(0, 10);
