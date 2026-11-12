import { useEffect } from 'react';

// Asks search engines not to list private pages (upload gate, feedback inbox).
export default function useNoIndex() {
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex,nofollow';
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
}
