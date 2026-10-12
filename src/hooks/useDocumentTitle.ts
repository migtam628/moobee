import { useEffect } from 'react';

const APP_NAME = 'MooBee';

/** Sets `document.title` for the current page and restores the default when it unmounts. */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
