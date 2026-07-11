import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (navigationType === 'POP') return;

    // Deferred to the next animation frame on purpose: on mobile, navigating
    // from a link inside the open sidebar drawer causes the drawer to
    // auto-close (see BrandSidebar/CreatorSidebar/AdminSidebar's
    // `setIsOpen(false)` on route change), which unlocks useLockBodyScroll and
    // restores whatever scrollY existed *before* the drawer was opened - after
    // this same route change has already committed. A synchronous reset here
    // would run first and then get overwritten by that restore. Running one
    // frame later guarantees this reset is the last word.
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, navigationType]);

  return null;
}
