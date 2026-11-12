import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import useNoIndex from '../utils/useNoIndex.js';

const SESSION = 'tmk-feedback-session';   // sessionStorage: { token, expiresAt }. The key itself is never stored.
const readSession = () => {
  try { const s = JSON.parse(sessionStorage.getItem(SESSION) || 'null'); return s && s.expiresAt > Date.now() ? s : null; } catch { return null; }
};

const KIND = {
  bug: ['🐞 Bug', 'bg-rose-50 text-rose-700 ring-rose-200'],
  suggestion: ['💡 Suggestion', 'bg-amber-50 text-amber-700 ring-amber-200'],
  question: ['❓ Question', 'bg-sky-50 text-sky-700 ring-sky-200'],
  other: ['💬 Other', 'bg-slate-100 text-slate-600 ring-slate-200'],
};
const STATUS = {
  new: ['New', 'bg-indigo-600 text-white'],
  read: ['Read', 'bg-slate-100 text-slate-600'],
  resolved: ['Resolved', 'bg-emerald-100 text-emerald-700'],
};
const when = (iso) => { try { return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } };

function Login({ notice, onDone }) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!key.trim()) return setError('Please enter the feedback key.');
    setBusy(true); setError('');
    try { onDone(await api('/api/feedback-admin/login', { method: 'POST', body: { key: key.trim() } })); }
    catch (err) { setError(err.status === 401 ? 'That key is not correct.' : err.message); setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="card overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-7 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-3xl">📥</span>
          <h1 className="mt-3 text-xl font-extrabold text-slate-900">Feedback inbox</h1>
          <p className="mt-1 text-sm text-slate-500">Private. Sign in with the Feedback Admin Key.</p>
        </div>
        <div className="space-y-3 p-6">
          {notice && <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
          <label htmlFor="fb-key" className="block text-sm font-semibold text-slate-700">Feedback Admin Key</label>
          <div className="relative">
            <input id="fb-key" type={show ? 'text' : 'password'} className="input !pr-16" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} disabled={busy} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide key' : 'Show key'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">{show ? 'Hide' : 'Show'}</button>
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button type="submit" className="btn w-full" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
          <p className="text-[11px] leading-snug text-slate-400">This is not the upload key. After signing in you stay signed in for 2 hours, only in this tab.</p>
        </div>
      </form>
    </div>
  );
}

function Panel({ token, onSignOut }) {
  const [status, setStatus] = useState('all');
  const [kind, setKind] = useState('all');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ new: 0, read: 0, resolved: 0, all: 0 });
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const auth = { Authorization: `Bearer ${token}` };
  const expired = () => onSignOut('Your session expired. Please sign in again.');

  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const query = useCallback((offset) => {
    const p = new URLSearchParams({ limit: '30', offset: String(offset) });
    if (status !== 'all') p.set('status', status);
    if (kind !== 'all') p.set('kind', kind);
    if (dq) p.set('q', dq);
    return api(`/api/feedback-admin/feedbacks?${p}`, { headers: { Authorization: `Bearer ${token}` } });
  }, [status, kind, dq, token]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const d = await query(0); setItems(d.items); setTotal(d.total); setCounts(d.counts); }
    catch (e) { if (e.status === 401) onSignOut('Your session expired. Please sign in again.'); else setError(e.message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    setMore(true);
    try { const d = await query(items.length); setItems((l) => [...l, ...d.items]); setTotal(d.total); }
    catch (e) { if (e.status === 401) expired(); else setError(e.message); }
    finally { setMore(false); }
  };

  const act = async (fn) => { try { await fn(); } catch (e) { if (e.status === 401) expired(); else setError(e.message); } };

  const changeStatus = (it, next) => act(async () => {
    const prev = it.status;                                   // read before the request, not after it
    await api(`/api/feedback-admin/feedbacks/${it.id}`, { method: 'PATCH', body: { status: next }, headers: auth });
    const leaves = status !== 'all' && next !== status;
    setItems((l) => (leaves ? l.filter((x) => x.id !== it.id) : l.map((x) => (x.id === it.id ? { ...x, status: next } : x))));
    if (leaves) setTotal((t) => t - 1);
    setCounts((c) => ({ ...c, [prev]: c[prev] - 1, [next]: c[next] + 1 }));
  });

  const remove = (it) => act(async () => {
    const prev = it.status;
    await api(`/api/feedback-admin/feedbacks/${it.id}`, { method: 'DELETE', headers: auth });
    setItems((l) => l.filter((x) => x.id !== it.id));
    setTotal((t) => t - 1);
    setCounts((c) => ({ ...c, [prev]: c[prev] - 1, all: c.all - 1 }));
    setConfirmId(null);
  });

  const stats = [['all', 'All', 'text-slate-900'], ['new', 'New', 'text-indigo-600'], ['read', 'Read', 'text-slate-600'], ['resolved', 'Resolved', 'text-emerald-600']];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">📥 Feedback inbox</h1>
          <p className="text-sm text-slate-500">Private. Visitors can send feedback but cannot see any of it.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !px-3" onClick={load}>↻ Refresh</button>
          <button className="btn-ghost !px-3" onClick={() => onSignOut('You have signed out.')}>Sign out</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {stats.map(([k, label, color]) => (
          <button key={k} onClick={() => setStatus(k)} aria-pressed={status === k}
            className={`card px-2 py-3 text-center transition ${status === k ? 'ring-2 ring-indigo-400' : 'hover:border-indigo-200'}`}>
            <p className={`text-2xl font-black tabular-nums ${color}`}>{counts[k]}</p>
            <p className="text-[11px] font-semibold text-slate-500">{label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input type="search" aria-label="Search feedback" className="input !w-auto min-w-[10rem] flex-1" placeholder="Search messages…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by type" className="input !w-auto" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">All types</option>
          {Object.entries(KIND).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading && <div className="space-y-3" aria-busy="true">{[1, 2, 3].map((i) => <div key={i} className="card h-28 animate-pulse bg-slate-100" />)}</div>}
      {!loading && items.length === 0 && !error && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-3xl">📭</p>
          <p className="mt-2 font-bold text-slate-800">{counts.all === 0 ? 'No feedback yet' : 'Nothing matches these filters'}</p>
        </div>
      )}

      {!loading && items.map((it) => (
        <article key={it.id} className={`card p-4 ${it.status === 'new' ? 'border-indigo-200' : ''}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${KIND[it.kind]?.[1] || KIND.other[1]}`}>{KIND[it.kind]?.[0] || KIND.other[0]}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS[it.status]?.[1]}`}>{STATUS[it.status]?.[0]}</span>
            <span className="ml-auto text-xs text-slate-400">{when(it.created_at)}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed text-slate-800">{it.message}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {it.name && <span>👤 {it.name}</span>}
            {it.contact && <span>📞 {it.contact}</span>}
            {it.page && <span>📄 {it.page}</span>}
            {it.user_agent && <span className="max-w-full truncate" title={it.user_agent}>📱 {it.user_agent}</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            {it.status !== 'read' && <button onClick={() => changeStatus(it, 'read')} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">Mark read</button>}
            {it.status !== 'resolved' && <button onClick={() => changeStatus(it, 'resolved')} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">✓ Resolve</button>}
            {it.status !== 'new' && <button onClick={() => changeStatus(it, 'new')} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Mark new</button>}
            <span className="ml-auto">
              {confirmId === it.id ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-rose-700">Delete for good?</span>
                  <button onClick={() => remove(it)} className="rounded-full bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700">Yes, delete</button>
                  <button onClick={() => setConfirmId(null)} className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">Cancel</button>
                </span>
              ) : <button onClick={() => setConfirmId(it.id)} aria-label="Delete feedback" className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">🗑 Delete</button>}
            </span>
          </div>
        </article>
      ))}

      {!loading && items.length < total && (
        <button className="btn-ghost w-full" onClick={loadMore} disabled={more}>{more ? 'Loading…' : `Load more (${total - items.length} left)`}</button>
      )}
    </div>
  );
}

export default function FeedbackAdmin() {
  useNoIndex();
  const [session, setSession] = useState(readSession);
  const [notice, setNotice] = useState('');

  const signOut = useCallback((msg = '') => { sessionStorage.removeItem(SESSION); setSession(null); setNotice(msg); }, []);
  const signedIn = (s) => { sessionStorage.setItem(SESSION, JSON.stringify(s)); setSession(s); setNotice(''); };

  if (!session) return <Login notice={notice} onDone={signedIn} />;
  return <Panel token={session.token} onSignOut={signOut} />;
}
