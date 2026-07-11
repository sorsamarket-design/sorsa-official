import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Keyed by React Router's per-history-entry location.key rather than pathname,
// so visiting the same route twice in history (e.g. two different scroll
// depths on /creator/campaigns) restores the right position for each entry.
const scrollPositions = new Map<string, number>();

export default function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    // The browser's own scroll restoration can race with (or duplicate) the
    // restore below, especially since this is a client-rendered SPA where the
    // browser doesn't know when our new page has actually finished laying
    // out. Taking manual control makes this component the single source of
    // truth for scroll position on every navigation, not just a fallback.
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (navigationType === 'POP') {
      const savedY = scrollPositions.get(location.key) ?? 0;
      window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.key, navigationType]);

  useLayoutEffect(() => {
    return () => {
      scrollPositions.set(location.key, window.scrollY);
    };
  }, [location.key]);

  return null;
}
