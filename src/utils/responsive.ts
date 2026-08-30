/**
 * Responsive design helper utilities for mobile-first styling and viewport detection.
 */
import { useState, useEffect } from 'react';

/**
 * Checks if the current viewport width is less than 768px (standard mobile breakpoint).
 * @returns boolean indicating if the screen is mobile-sized (< 768px).
 */
export function isMobileScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Returns mobile-specific or desktop-specific overflow and layout CSS classes.
 * @param isMobile Optional boolean override. If not provided, evaluates isMobileScreen().
 * @returns CSS class string for managing container overflow safely.
 */
export function getResponsiveOverflowClass(isMobile?: boolean): string {
  const mobile = isMobile !== undefined ? isMobile : isMobileScreen();
  return mobile
    ? 'overflow-y-auto overflow-x-hidden touch-pan-y'
    : 'overflow-y-auto overflow-x-hidden';
}

/**
 * React hook to reactively track if the viewport is mobile width (< 768px).
 * @param breakpoint Breakpoint in pixels (defaults to 768).
 * @returns boolean indicating if the current viewport width is below the breakpoint.
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}
