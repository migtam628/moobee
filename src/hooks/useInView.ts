import { useCallback, useState, type RefCallback } from 'react';

/**
 * True once the referenced element has come within `rootMargin` of the viewport (and stays true).
 * Used to defer below-the-fold API requests until the user is about to see them. Environments
 * without IntersectionObserver report "in view" immediately so nothing is ever left unloaded.
 */
export function useInView<T extends Element>(rootMargin = '400px'): [RefCallback<T>, boolean] {
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  const ref = useCallback<RefCallback<T>>(
    (node) => {
      if (!node || inView) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setInView(true);
            observer.disconnect();
          }
        },
        { rootMargin },
      );
      observer.observe(node);
      return () => {
        observer.disconnect();
      };
    },
    [inView, rootMargin],
  );

  return [ref, inView];
}
