import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

const KINDS = [['bug', '🐞', 'Bug report'], ['suggestion', '💡', 'Suggestion'], ['question', '❓', 'Question'], ['other', '💬', 'Other']];

export default function Feedback() {
  const [params] = useSearchParams();
  const from = params.get('from') || '';
  const [kind, setKind] = useState('bug');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [website, setWebsite] = useState('');           // honeypot: real people never see or fill it
  const [state, setState] = useState('idle');           // idle | sending | sent
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 5) return setError('Please write at least a few words so we can understand.');
    setState('sending'); setError('');
    try {
      await api('/api/feedback', {
        method: 'POST',
        body: { kind, message: message.trim(), name: name.trim(), contact: contact.trim(), website, page: from.startsWith('/') && !from.startsWith('//') ? from : '' },
      });
      setState('sent');
    } catch (err) { setError(err.message); setState('idle'); }
  };

  if (state === 'sent') {
    return (
      <div className="card mx-auto max-w-md animate-fade-up space-y-3 p-8 text-center">
        <p className="text-5xl">🙏</p>
        <h1 className="text-xl font-extrabold text-slate-900">Thank you!</h1>
        <p className="text-sm text-slate-500">Your feedback was sent. Only the site admin can read it.</p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <button className="btn-ghost" onClick={() => { setMessage(''); setState('idle'); }}>Send another</button>
          <Link to="/" className="btn">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Send feedback</h1>
        <p className="text-sm text-slate-500">Found a bug or have an idea? Tell us. Your message is private and only the site admin can read it.</p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700">What is it about?</legend>
          <div className="flex flex-wrap gap-2">
            {KINDS.map(([k, icon, label]) => (
              <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${kind === k ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{icon} {label}</button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="fb-message" className="mb-1 block text-sm font-semibold text-slate-700">Your message</label>
          <textarea id="fb-message" className="input" rows={6} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder={kind === 'bug' ? 'What happened? What did you expect to happen? On which page?' : 'Write your message here…'} />
          <p className="mt-1 text-right text-xs text-slate-400">{message.length} / 2000</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="fb-name" className="mb-1 block text-sm font-semibold text-slate-700">Name <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="fb-name" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="fb-contact" className="mb-1 block text-sm font-semibold text-slate-700">Email or phone <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="fb-contact" className="input" maxLength={100} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Only if you want a reply" />
          </div>
        </div>

        {/* honeypot */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Website <input tabIndex={-1} autoComplete="off" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
        </div>

        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <button type="submit" className="btn w-full" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send feedback'}</button>
        <p className="text-center text-[11px] text-slate-400">We store your message, the page you came from and your device type. We do not store your IP address.</p>
      </form>
    </div>
  );
}
