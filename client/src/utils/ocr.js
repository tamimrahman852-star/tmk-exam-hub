import { createWorker } from 'tesseract.js';

// Runs fully in the browser (free). Language data is downloaded once from a public CDN.
// lang examples: 'eng', 'eng+ben' (English + Bangla)
export async function ocrImage(file, lang = 'eng', onProgress) {
  const worker = await createWorker(lang, 1, {
    logger: (m) => { if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100)); },
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

// Turns raw OCR text into { text, a, b, c, d, correct }.
// Understands "A) ...", "(b) ...", "C. ...", multi-line options, "1." / "Q1." prefixes and "Ans: B".
export function parseQuestion(raw) {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const opts = { A: '', B: '', C: '', D: '' };
  const stem = [];
  let current = null;
  let correct = '';

  for (const line of lines) {
    const ans = line.match(/^(?:ans(?:wer)?|correct)\s*[:\-.]?\s*\(?([A-Da-d])\)?\b/i);
    if (ans) { correct = ans[1].toUpperCase(); current = null; continue; }

    const opt = line.match(/^\(?([A-Da-d])[).:\-]\s*(.*)$/);
    if (opt) { current = opt[1].toUpperCase(); opts[current] = opt[2]; continue; }

    if (current) opts[current] += ' ' + line;
    else stem.push(line);
  }

  const text = stem.join(' ').replace(/^(?:q(?:uestion)?\s*)?\d+\s*[.):\-]\s*/i, '').trim();
  return { text, a: opts.A.trim(), b: opts.B.trim(), c: opts.C.trim(), d: opts.D.trim(), correct };
}
