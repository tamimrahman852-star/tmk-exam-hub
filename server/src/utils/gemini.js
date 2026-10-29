// GEMINI_MODEL can be a comma-separated list. Each model is tried (one retry on overload)
// before falling back to the next one.
const MODELS = (process.env.GEMINI_MODEL || 'gemini-3.5-flash,gemini-3.6-flash,gemini-3.1-flash-lite')
  .split(',').map((m) => m.trim()).filter(Boolean);
const BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function generate(body) {
  let last = { ok: false, status: 500 };
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await fetch(`${BASE}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) return { ok: true, data };
      last = { ok: false, status: r.status };
      console.error(`Gemini error [${model}] ${r.status}`, JSON.stringify(data).slice(0, 300));
      if ([400, 401, 403].includes(r.status)) return last; // key/request problem: other models won't help
      if (r.status === 404) break;                           // model name unavailable: next model
      await sleep(Number(process.env.GEMINI_RETRY_MS) || 1500);
    }
  }
  return last;
}

export const textOf = (data) =>
  (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
