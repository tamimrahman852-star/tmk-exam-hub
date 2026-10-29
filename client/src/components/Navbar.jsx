import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center gap-2">
          {/* logo.png lives in client/public and is served from the site root */}
          <img src="/logo.png" alt="TMK Exam Hub" className="h-9 w-auto" />
          <span className="text-lg font-bold text-indigo-700">TMK Exam Hub</span>
        </Link>
        <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-indigo-700">Admin</Link>
      </div>
    </header>
  );
}
