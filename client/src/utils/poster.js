// Draws the shareable result poster (1080x1350 PNG) with the Canvas API: no extra libraries.
const W = 1080, H = 1350;
const FONT = '"Inter","Hind Siliguri",system-ui,sans-serif';

function round(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    return kept;
  }
  return lines;
}

const loadImage = (src, ms = 2500) => new Promise((resolve) => {
  const img = new Image();
  const t = setTimeout(() => resolve(null), ms);
  img.onload = () => { clearTimeout(t); resolve(img); };
  img.onerror = () => { clearTimeout(t); resolve(null); };
  img.src = src;
});

export async function makePosterBlob({ title, score, total, accuracy, correct, wrong, skipped, host }) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported');

  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 800))]);
  const logo = await loadImage('/logo.png');

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#f8fafc'); bg.addColorStop(1, '#eef2ff');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // white card with soft shadow
  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,.12)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#ffffff'; round(ctx, 60, 60, 960, 1230, 48); ctx.fill();
  ctx.restore();

  // header band
  ctx.save();
  round(ctx, 60, 60, 960, 1230, 48); ctx.clip();
  const band = ctx.createLinearGradient(60, 60, 1020, 330);
  band.addColorStop(0, '#eef2ff'); band.addColorStop(1, '#f5f3ff');
  ctx.fillStyle = band; ctx.fillRect(60, 60, 960, 270);
  ctx.restore();

  // logo badge
  ctx.save();
  ctx.beginPath(); ctx.arc(170, 195, 72, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  ctx.fillStyle = '#fff'; ctx.fillRect(98, 123, 144, 144);
  if (logo) { const s = logo.width; ctx.drawImage(logo, 0, (logo.height - s) / 2, s, s, 98, 123, 144, 144); }
  ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath(); ctx.arc(170, 195, 72, 0, Math.PI * 2); ctx.stroke();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0f172a'; ctx.font = `800 46px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText('TMK Exam Hub', 270, 190);
  ctx.fillStyle = '#64748b'; ctx.font = `500 28px ${FONT}`;
  ctx.fillText('Exam result', 270, 236);

  // title
  ctx.textAlign = 'center'; ctx.fillStyle = '#0f172a'; ctx.font = `700 54px ${FONT}`;
  const lines = wrap(ctx, title, 840, 2);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 420 + i * 68));

  // score ring
  const cx = W / 2, cy = 700, r = 150;
  const pct = total > 0 ? Math.max(0, Math.min(1, score / total)) : 0;
  ctx.lineWidth = 30; ctx.lineCap = 'round';
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  if (pct > 0) {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, '#4f46e5'); g.addColorStop(1, '#8b5cf6');
    ctx.strokeStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); ctx.stroke();
  }
  ctx.fillStyle = '#0f172a'; ctx.font = `800 92px ${FONT}`;
  ctx.fillText(String(score), cx, cy + 22);
  ctx.fillStyle = '#64748b'; ctx.font = `500 30px ${FONT}`;
  ctx.fillText(`out of ${total}`, cx, cy + 70);

  // accuracy pill
  const label = `${accuracy}% accuracy`;
  ctx.font = `700 34px ${FONT}`;
  const pw = ctx.measureText(label).width + 80;
  ctx.fillStyle = '#eef2ff'; round(ctx, cx - pw / 2, 905, pw, 70, 35); ctx.fill();
  ctx.fillStyle = '#4338ca'; ctx.fillText(label, cx, 952);

  // stat boxes
  const boxes = [[correct, 'Correct', '#16a34a'], [wrong, 'Wrong', '#dc2626'], [skipped, 'Skipped', '#64748b']];
  boxes.forEach(([v, name, color], i) => {
    const x = 120 + i * 300;
    ctx.fillStyle = '#f8fafc'; round(ctx, x, 1020, 270, 150, 28); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#e2e8f0'; round(ctx, x, 1020, 270, 150, 28); ctx.stroke();
    ctx.fillStyle = color; ctx.font = `800 58px ${FONT}`; ctx.fillText(String(v), x + 135, 1094);
    ctx.fillStyle = '#64748b'; ctx.font = `500 26px ${FONT}`; ctx.fillText(name, x + 135, 1140);
  });

  // footer
  ctx.fillStyle = '#0f172a'; ctx.font = `700 36px ${FONT}`;
  ctx.fillText('Can you beat my score?', cx, 1235);
  ctx.fillStyle = '#4f46e5'; ctx.font = `600 28px ${FONT}`;
  ctx.fillText(host || '', cx, 1272);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'));
}
