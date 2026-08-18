import { useState, useEffect, useRef } from 'react';

/**
 * Hook to detect whether the mobile virtual keyboard is actively open on screen
 * using ResizeObserver on documentElement + window resize + visualViewport.
 * 
 * When the keyboard closes on Android/iOS (even if an input still retains cursor focus),
 * the container height immediately restores to full height and isKeyboardOpen becomes false.
 */
export const useVirtualKeyboard = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const maxHeightRef = useRef<number>(0);

  useEffect(() => {
    const getViewportHeight = (): number => {
      // Prioritize the inner container/documentElement height as it reliably reflects CSS box size
      const docHeight = document.documentElement?.clientHeight || 0;
      const winHeight = window.innerHeight || 0;
      const vvHeight = window.visualViewport?.height || 0;

      // Use the smallest non-zero measurement which represents the true visible area
      const candidates = [docHeight, winHeight, vvHeight].filter((h) => h > 50);
      if (candidates.length === 0) return winHeight;
      return Math.min(...candidates);
    };

    // Initialize maxHeight
    const initialHeight = getViewportHeight();
    if (initialHeight > maxHeightRef.current) {
      maxHeightRef.current = initialHeight;
    }

    const evaluateKeyboard = () => {
      const currentHeight = getViewportHeight();

      // If screen expanded (e.g. user rotated device or browser header collapsed), update max height
      if (currentHeight > maxHeightRef.current) {
        maxHeightRef.current = currentHeight;
      }

      // If height dropped by more than 120px (typical mobile keyboard is 220px-350px), keyboard is open
      const diff = maxHeightRef.current - currentHeight;
      const isShrunk = diff > 120 || (maxHeightRef.current > 0 && currentHeight < maxHeightRef.current * 0.82);

      setIsKeyboardOpen(isShrunk);
    };

    // Run evaluation immediately
    evaluateKeyboard();

    // 1. ResizeObserver on document.documentElement and document.body
    let resizeObserver: ResizeObserver | null = null;
    try {
      if (typeof ResizeObserver !== 'undefined' && typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => {
          evaluateKeyboard();
        });
        if (document.documentElement) {
          resizeObserver.observe(document.documentElement);
        }
        if (document.body) {
          resizeObserver.observe(document.body);
        }
      }
    } catch (err) {
      console.warn('ResizeObserver not constructible:', err);
    }

    // 2. Window and VisualViewport listeners
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', evaluateKeyboard);
      vv.addEventListener('scroll', evaluateKeyboard);
    }
    window.addEventListener('resize', evaluateKeyboard);
    window.addEventListener('orientationchange', () => {
      // Reset max height on orientation change
      setTimeout(() => {
        maxHeightRef.current = getViewportHeight();
        evaluateKeyboard();
      }, 100);
    });

    return () => {
      resizeObserver?.disconnect();
      if (vv) {
        vv.removeEventListener('resize', evaluateKeyboard);
        vv.removeEventListener('scroll', evaluateKeyboard);
      }
      window.removeEventListener('resize', evaluateKeyboard);
    };
  }, []);

  return { isKeyboardOpen };
};
