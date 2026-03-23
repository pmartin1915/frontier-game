import { useState, useEffect } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Returns true when the viewport is narrower than 768px.
 * Uses matchMedia for efficient change detection (no resize polling).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
