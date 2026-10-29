import { Link, NavLink } from 'react-router-dom';

const link = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`;

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          {/* logo.png lives in client/public and is served from the site root */}
          <img src="/logo.png" alt="TMK Exam Hub" className="h-9 w-auto" />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            TMK <span className="text-indigo-600">Exam Hub</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={link}>Exams</NavLink>
          <NavLink to="/admin" className={link}>Create</NavLink>
        </nav>
      </div>
    </header>
  );
}
