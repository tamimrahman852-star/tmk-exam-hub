import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import TakeExam from './pages/TakeExam.jsx';
import AdminCreate from './pages/AdminCreate.jsx';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exam/:slug" element={<TakeExam />} />
          <Route path="/admin" element={<AdminCreate />} />
          <Route path="*" element={<p className="py-20 text-center text-slate-500">Page not found.</p>} />
        </Routes>
      </main>
      <footer className="border-t bg-white py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} TMK Exam Hub · Practice. Compete. Improve.
      </footer>
    </div>
  );
}
