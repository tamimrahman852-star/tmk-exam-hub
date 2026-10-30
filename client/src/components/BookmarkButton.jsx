import { useBookmarks, makeBookmark, toggleBookmark } from '../utils/bookmarks.js';

// Saves one question from the result so the student can revise it later.
export default function BookmarkButton({ q, exam }) {
  const saved = useBookmarks().some((b) => b.id === q.id);
  return (
    <button type="button" onClick={() => toggleBookmark(makeBookmark(q, exam))} aria-pressed={saved}
      aria-label={saved ? 'Remove from saved questions' : 'Save this question'}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition active:scale-95
        ${saved ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
      <span>{saved ? '🔖' : '🏷️'}</span>{saved ? 'Saved' : 'Save'}
    </button>
  );
}
