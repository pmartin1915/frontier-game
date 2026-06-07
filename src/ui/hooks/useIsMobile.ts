/**
 * @file Custom React hook for detecting mobile devices
 * @module ui/hooks/useIsMobile
 * @description
 * Provides responsive layout detection by monitoring viewport width.
 * Automatically updates when the window is resized.
 *
 * @example
 * const isMobile = useIsMobile();
 * // Returns true when viewport width <= 768px
 *
 * @asOf 2026-06-07
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook to detect mobile viewport size.
 *
 * @param {number} [breakpoint=768] - Viewport width breakpoint in pixels
 * @param {number} [debounceDelay=200] - Debounce delay in milliseconds
 * @returns {boolean} True if viewport width is <= breakpoint (mobile), false otherwise
 */
export function useIsMobile(breakpoint = 768, debounceDelay = 200): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    // Initial check
    checkMobile();

    // Debounced resize handler
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, debounceDelay);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [breakpoint, debounceDelay]);

  return isMobile;
}