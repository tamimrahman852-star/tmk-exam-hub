import { useState } from 'react';
import { api } from '../api.js';
import { resizeImage, readBase64 } from '../utils/image.js';

const MAX_PDF = 5 * 1024 * 1024;

export default function BulkImport({ onImport, adminKey }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;

    setBusy(true);
    const all = [];
    try {
      for (const [i, f] of files.entries()) {
        const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
        setStatus(`Reading ${isPdf ? 'PDF' : 'image'} ${i + 1} of ${files.length}… (${isPdf ? 'a PDF can take up to a minute' : 'about 10-20 seconds'})`);
        let payload;
        if (isPdf) {
          if (f.size > MAX_PDF) throw new Error(`${f.name} is bigger than 5 MB. Split the PDF into smaller parts.`);
          payload = { image: await readBase64(f), mimeType: 'application/pdf' };
        } else {
          payload = await resizeImage(f);
        }
        const res = await api('/api/extract', { method: 'POST', headers: { 'x-admin-key': adminKey }, body: payload });
        all.push(...res.questions);
      }
      setStatus(`✅ ${all.length} questions added. Please review them before saving.`);
    } catch (err) {
      setStatus(`⚠️ ${err.message}${all.length ? ` (${all.length} questions from earlier files were added)` : ''}`);
    } finally {
      if (all.length) onImport(all);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/70 p-4 transition hover:border-indigo-400">
      <div>
        <p className="font-bold text-indigo-800">📸 Upload question pages (AI)</p>
        <p className="mt-0.5 text-xs text-slate-600">
          Photos (JPG, PNG, WEBP) or PDF (up to 5 MB). Questions, options, the answer key and any printed explanations are filled in automatically.
        </p>
      </div>
      <label className={`btn cursor-pointer ${busy ? 'pointer-events-none opacity-60' : ''}`}>
        {busy ? 'Working…' : 'Choose files'}
        <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handle} />
      </label>
      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
