import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEVELOPER, waLink, mailLink } from '../config/site.js';

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* clipboard blocked */ }
  };
  return <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="btn-ghost !px-3 !py-2 !text-xs">{done ? '✓ Copied' : '📋 Copy'}</button>;
}

export default function About() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section aria-label="Developer profile" className="card overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-8 text-center sm:py-10">
          <div aria-hidden className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-3xl font-black text-white shadow-lg shadow-indigo-600/25 ring-4 ring-white">TR</div>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-indigo-600">About the developer</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">{DEVELOPER.name}</h1>
          <p lang="bn" className="mt-0.5 text-lg font-semibold text-slate-600">({DEVELOPER.nameBn})</p>
          <span className="mt-4 inline-flex rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-bold text-indigo-700">{DEVELOPER.role}</span>
        </div>
      </section>

      <section aria-label="Overview" className="card p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-indigo-600">Overview</h2>
        <p className="mt-2 leading-relaxed text-slate-700">{DEVELOPER.overview}</p>
      </section>

      <section aria-label="Contact" className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-indigo-600">Contact</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400"><span className="text-base">✉️</span> Email</p>
            <p className="mt-1 break-all font-semibold text-slate-900">{DEVELOPER.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="btn !px-3 !py-2 !text-xs" href={mailLink('Hello from TMK Exam Hub', '')}>Send email</a>
              <CopyButton text={DEVELOPER.email} label="email" />
            </div>
          </div>
          <div className="card p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400"><span className="text-base">📞</span> Phone / WhatsApp</p>
            <p className="mt-1 font-semibold tabular-nums text-slate-900">{DEVELOPER.phone}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="btn !bg-none !bg-emerald-600 !px-3 !py-2 !text-xs hover:!bg-emerald-700" href={waLink('Hello, I found you through TMK Exam Hub.')} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a className="btn-ghost !px-3 !py-2 !text-xs" href={`tel:+${DEVELOPER.whatsapp}`}>Call</a>
              <CopyButton text={DEVELOPER.phone} label="phone number" />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link to="/feedback" className="btn-ghost">💬 Send feedback</Link>
        <Link to="/upload-exam" className="btn-ghost">🔑 Get an upload key</Link>
      </div>
    </div>
  );
}
