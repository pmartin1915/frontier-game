/**
 * @file Mobile Detection Hook
 * @module ui/hooks/useIsMobile
 * @description
 * React hook for detecting mobile device screen size.
 *
 * @asOf 2026-06-07
 */

import { useState, useEffect } from 'react';

/**
 * Determines if the application is running on a mobile device.
 *
 * Uses a 768px breakpoint to distinguish between mobile and desktop layouts.
 * Automatically updates when the window is resized.
 *
 * @returns {boolean} True if the screen width is <= 768px (mobile), false otherwise.
 *
 * @example
 * const isMobile = useIsMobile();
 * return <div className={isMobile ? 'mobile' : 'desktop'}>...</div>;
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return isMobile;
}