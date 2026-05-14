import { useState, useEffect } from 'react';

/**
 * Returns the current available height for the BookingModal container,
 * computed as min(visualViewport.height * 0.9, window.innerHeight * 0.9).
 *
 * Falls back to window.innerHeight when the Visual Viewport API is unavailable.
 * Listens to the `resize` event on `window.visualViewport` and recomputes on
 * every change (e.g. when the on-screen keyboard opens on mobile).
 *
 * Validates: Requirements 6.6
 */
export function useVisualViewport(): number {
  const [height, setHeight] = useState<number>(() => {
    const vv = window.visualViewport;
    if (vv) {
      return Math.min(vv.height * 0.9, window.innerHeight * 0.9);
    }
    return window.innerHeight * 0.9;
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handler = () => {
      setHeight(Math.min(vv.height * 0.9, window.innerHeight * 0.9));
    };

    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  return height;
}

/**
 * Pure helper used by property tests (Property 14).
 * Computes the modal max-height from raw viewport values.
 */
export function computeModalMaxHeight(
  visualViewportHeight: number,
  innerHeight: number,
): number {
  return Math.min(visualViewportHeight * 0.9, innerHeight * 0.9);
}
