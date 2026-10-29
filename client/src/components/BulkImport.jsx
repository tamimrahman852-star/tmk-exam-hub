import { useState } from 'react';
import { api } from '../api.js';
import { resizeImage } from '../utils/image.js';

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
        setStatus(`Reading image ${i + 1} of ${files.length}… (takes ~10-20 seconds)`);
        const { image, mimeType } = await resizeImage(f);
        const res = await api('/api/extract', { method: 'POST', headers: { 'x-admin-key': adminKey }, body: { image, mimeType } });
        all.push(...res.questions);
      }
      setStatus(`✅ ${all.length} questions added. Please review them before saving.`);
    } catch (err) {
      setStatus(`⚠️ ${err.message}${all.length ? ` (${all.length} questions from earlier images were added)` : ''}`);
    } finally {
      if (all.length) onImport(all);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 p-4">
      <p className="font-semibold text-indigo-800">📸 Upload a question page (AI)</p>
      <p className="text-xs text-slate-600">
        Upload one or more photos. All questions, options and the answer key (if printed on the page) are filled in automatically.
      </p>
      <label className={`btn cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
        {busy ? 'Working…' : 'Choose image(s)'}
        <input type="file" accept="image/*" multiple className="hidden" onChange={handle} />
      </label>
      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
