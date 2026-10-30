// Quotable is a free public quote API. It is sometimes slow or offline, so every caller must have a fallback.
export async function fetchQuotable(ms = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch('https://api.quotable.io/random?tags=inspirational|wisdom', { signal: ctrl.signal });
    if (!res.ok) throw new Error('Quote service error');
    const json = await res.json();
    if (!json?.content) throw new Error('No quote');
    return { text: json.content, author: json.author || 'Unknown', source: 'quotable' };
  } finally {
    clearTimeout(timer);
  }
}
