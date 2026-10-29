import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import TakeExam from './pages/TakeExam.jsx';
import AdminCreate from './pages/AdminCreate.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exam/:slug" element={<TakeExam />} />
          <Route path="/admin" element={<AdminCreate />} />
          <Route path="*" element={<p className="py-20 text-center text-slate-500">Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
