import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import InstallButton from './InstallButton.jsx';
import { useBookmarks } from '../utils/bookmarks.js';

const link = ({ isActive }) =>
  `rounded-lg px-2.5 py-1.5 text-sm font-medium transition sm:px-3 ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`;

export default function Navbar() {
  const saved = useBookmarks().length;
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-30 border-b bg-white/85 backdrop-blur-md transition-shadow duration-300 ${scrolled ? 'border-slate-200 shadow-md shadow-slate-900/5' : 'border-slate-200/70'}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          {/* logo.png sits in client/public. The badge is centred in a tall image, so a square box with object-cover shows just the badge. */}
          <img src="/logo.png" alt="TMK Exam Hub" className="h-10 w-10 rounded-full object-cover shadow-sm ring-1 ring-slate-200" />
          <span className="text-lg font-black tracking-tight text-slate-900">
            TMK<span className="hidden bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent sm:inline"> Exam Hub</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={link}>Exams</NavLink>
          <NavLink to="/bookmarks" className={link}>Saved{saved > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{saved}</span>}</NavLink>
          <NavLink to="/admin" className={link}>Create</NavLink>
          <InstallButton />
        </nav>
      </div>
    </header>
  );
}
