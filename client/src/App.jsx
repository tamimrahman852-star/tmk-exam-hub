import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import TakeExam from './pages/TakeExam.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import ReviewMistakes from './pages/ReviewMistakes.jsx';
import QuranHub from './components/QuranHub.jsx';
import About from './pages/About.jsx';
import UploadExam from './pages/UploadExam.jsx';
import Feedback from './pages/Feedback.jsx';
import FeedbackAdmin from './pages/FeedbackAdmin.jsx';

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  if (online) return null;
  return <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-white">You are offline. Reconnect to take exams and see results.</div>;
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <OfflineBanner />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <div key={pathname} className="animate-fade-up">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exam/:slug" element={<TakeExam />} />
          <Route path="/upload-exam" element={<UploadExam />} />
          <Route path="/admin" element={<Navigate to="/upload-exam" replace />} />
          <Route path="/admin/feedbacks" element={<FeedbackAdmin />} />
          <Route path="/about" element={<About />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/mistakes" element={<ReviewMistakes />} />
          <Route path="/quran" element={<QuranHub />} />
          <Route path="*" element={<p className="py-20 text-center text-slate-500">Page not found.</p>} />
        </Routes>
        </div>
      </main>
      <footer className="border-t bg-white py-5 text-center text-xs text-slate-400" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <nav aria-label="Footer" className="mb-2 flex justify-center gap-4 text-sm font-medium text-slate-500">
          <Link to="/about" className="transition hover:text-indigo-600">About</Link>
          <Link to={`/feedback?from=${encodeURIComponent(pathname)}`} className="transition hover:text-indigo-600">Feedback</Link>
        </nav>
        © {new Date().getFullYear()} TMK Exam Hub · Practice. Compete. Improve.
      </footer>
    </div>
  );
}
