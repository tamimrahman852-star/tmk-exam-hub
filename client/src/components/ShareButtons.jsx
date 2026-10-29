import { useState } from 'react';

export default function ShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${title}\nTake the exam here: ${url}`)}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <a href={wa} target="_blank" rel="noreferrer" className="btn !bg-green-600 hover:!bg-green-700">Share on WhatsApp</a>
      <button type="button" onClick={copy} className="btn-ghost">{copied ? 'Copied!' : 'Copy link'}</button>
    </div>
  );
}
