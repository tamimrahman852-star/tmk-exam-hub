import { useEffect, useState } from 'react';

// Tiny localStorage-backed lists (exam history, bookmarks). Everything stays on the student's device.
const EVT = 'tmk-storage';

export function readList(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export function writeList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* storage full or blocked */ }
  window.dispatchEvent(new Event(EVT)); // keeps every component (and tab) in sync
}

export function useStoredList(key) {
  const [list, setList] = useState(() => readList(key));
  useEffect(() => {
    const sync = () => setList(readList(key));
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
  }, [key]);
  return list;
}
