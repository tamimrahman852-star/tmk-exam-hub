import { useEffect, useState } from 'react';

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

// Shows "Install app" when the browser allows it (Android/Chrome/desktop) or an Add-to-Home-Screen tip on iPhone.
export default function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  const [tip, setTip] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const before = (e) => { e.preventDefault(); setPrompt(e); };
    const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', before); window.removeEventListener('appinstalled', done); };
  }, []);

  if (installed || (!prompt && !isIos())) return null;

  const click = async () => {
    if (prompt) { prompt.prompt(); await prompt.userChoice.catch(() => {}); setPrompt(null); } else setTip(true);
  };

  return (
    <>
      <button onClick={click} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95">⬇<span className="hidden sm:inline"> Install</span></button>
      {tip && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center" onClick={() => setTip(false)}>
          <div className="animate-sheet w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src="/icons/icon-192.png" alt="" className="mx-auto h-16 w-16 rounded-2xl shadow" />
            <p className="mt-3 text-lg font-extrabold">Install TMK Exam Hub</p>
            <p className="mt-1 text-sm text-slate-600">Tap the <b>Share</b> button in Safari, then choose <b>Add to Home Screen</b>.</p>
            <button className="btn mt-4 w-full" onClick={() => setTip(false)}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
