import { useState, useEffect, useRef } from 'react';

export const useScrollDirection = () => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      const currentScrollY = 
        target === document || target === document.documentElement
          ? window.scrollY
          : (target as HTMLElement).scrollTop || 0;

      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const diff = currentScrollY - lastScrollY.current;

          // Always visible near the top
          if (currentScrollY < 40) {
            setIsVisible(true);
          } else if (diff > 8) {
            // Scrolling down significantly -> hide
            setIsVisible(false);
          } else if (diff < -6) {
            // Scrolling up significantly -> show
            setIsVisible(true);
          }

          lastScrollY.current = Math.max(0, currentScrollY);
          ticking.current = false;
        });

        ticking.current = true;
      }
    };

    // Capture scrolls on window and any inner scrollable element
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  return { isVisible, setIsVisible };
};
