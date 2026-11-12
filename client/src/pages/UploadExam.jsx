import { useEffect, useState } from 'react';
import { api } from '../api.js';
import AdminCreate from './AdminCreate.jsx';
import useNoIndex from '../utils/useNoIndex.js';
import { DEVELOPER, waLink, mailLink } from '../config/site.js';

const SESSION_KEY = 'tmk-upload-key';          // sessionStorage: forgotten when the tab is closed
const verify = (key) => api('/api/admin/check', { headers: { 'x-admin-key': key } });

export default function UploadExam() {
  useNoIndex();
  const [key, setKey] = useState(null);                 // set only after the server accepted it
  const [input, setInput] = useState('');
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(() => !!sessionStorage.getItem(SESSION_KEY));
  const [error, setError] = useState('');

  // coming back in the same tab: check the saved key again instead of trusting it
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    verify(saved)
      .then(() => setKey(saved))
      .catch((e) => {
        if (e.status === 401) { sessionStorage.removeItem(SESSION_KEY); setError('Your upload session is no longer valid. Please enter the key again.'); }
        else setError(e.message);
      })
      .finally(() => setChecking(false));
  }, []);

  const unlock = async (e) => {
    e.preventDefault();
    const k = input.trim();
    if (!k) return setError('Please enter the upload key.');
    setChecking(true); setError('');
    try {
      await verify(k);
      sessionStorage.setItem(SESSION_KEY, k);
      setKey(k); setInput('');
    } catch (err) {
      setError(err.status === 401 ? 'That key is not correct. Contact the admin to get the right one.' : err.message);
    } finally { setChecking(false); }
  };

  const lock = () => { sessionStorage.removeItem(SESSION_KEY); setKey(null); setError(''); };

  if (key) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <p className="text-sm font-semibold text-emerald-800">🔓 Upload access unlocked</p>
          <button type="button" onClick={lock} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100">Lock</button>
        </div>
        <AdminCreate adminKey={key} />
      </div>
    );
  }

  const request = 'Hello, I would like to get the Question Upload Key for TMK Exam Hub.';

  return (
    <div className="mx-auto max-w-md space-y-4">
      <section className="card overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-7 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-3xl">🔐</span>
          <h1 className="mt-3 text-xl font-extrabold text-slate-900">Upload questions</h1>
          <p className="mt-1 text-sm text-slate-500">Only approved contributors can add exams. Enter the Question Upload Key to unlock the form.</p>
        </div>

        <form onSubmit={unlock} className="space-y-3 p-6">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="upload-key">Question Upload Key</label>
          <div className="relative">
            <input id="upload-key" type={show ? 'text' : 'password'} className="input !pr-16" value={input} autoComplete="off"
              onChange={(e) => setInput(e.target.value)} placeholder="Enter your upload key" disabled={checking} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide key' : 'Show key'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">{show ? 'Hide' : 'Show'}</button>
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button type="submit" className="btn w-full" disabled={checking}>{checking ? 'Checking…' : 'Unlock upload form'}</button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="font-bold text-slate-900">Don&apos;t have a key?</h2>
        <p className="mt-1 text-sm text-slate-500">Upload keys are given personally. Contact the admin on WhatsApp or Gmail and ask for the Question Upload Key.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="btn !bg-none !bg-emerald-600 hover:!bg-emerald-700" href={waLink(request)} target="_blank" rel="noopener noreferrer">WhatsApp · {DEVELOPER.phone}</a>
          <a className="btn-ghost" href={mailLink('Question Upload Key request - TMK Exam Hub', request)}>Gmail · {DEVELOPER.email}</a>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-slate-400">Never share your key. It is checked by the server and is not stored on this device after you close the tab.</p>
      </section>
    </div>
  );
}
