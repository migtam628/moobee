import { useEffect, useState } from 'react';

/** True once the window has scrolled past `threshold` px. Used to solidify the navbar. */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > threshold);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
    };
  }, [threshold]);

  return scrolled;
}
