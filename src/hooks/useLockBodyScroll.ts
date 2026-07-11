import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// The mobile sidebar drawers render as a fixed, full-height overlay, but nothing
// stopped the page underneath from still scrolling - so a touch that started on
// the drawer's non-scrollable areas (like the bottom profile card) fell through
// to the page behind it, which is what caused the scroll glitch on mobile.
// `overflow: hidden` on body alone doesn't reliably stop this on iOS Safari, so
// this also pins body (and html, for the same reason) to the current scroll
// position while locked. scrollY is captured before the lock and applied via
// `top`, so there's no visual jump when position: fixed takes effect.
//
// On unlock, the saved scrollY is only restored if we're still on the same
// route the drawer was opened on (closed via the backdrop/close button, no
// navigation happened). If the route changed while locked - the normal case
// when tapping a nav link inside the drawer - the new page owns scroll
// position now, so restoring the old offset here would fight with (and
// silently undo) that page's own scroll-to-top reset.
export function useLockBodyScroll(locked: boolean) {
  const { pathname } = useLocation();
  const currentPathnameRef = useRef(pathname);
  currentPathnameRef.current = pathname;

  useEffect(() => {
    if (!locked) return;

    const lockedPathname = currentPathnameRef.current;
    const { body, documentElement: html } = document;
    const scrollY = window.scrollY;
    const previousBody = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const previousHtmlOverflow = html.style.overflow;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    return () => {
      body.style.position = previousBody.position;
      body.style.top = previousBody.top;
      body.style.width = previousBody.width;
      body.style.overflow = previousBody.overflow;
      html.style.overflow = previousHtmlOverflow;

      if (currentPathnameRef.current === lockedPathname) {
        // requestAnimationFrame defers this one frame so it runs after Safari
        // has finished reflowing from the position: fixed removal above,
        // rather than racing it. The explicit `behavior: 'instant'` is
        // required because the legacy two-argument scrollTo(x, y) form still
        // inherits `scroll-behavior: smooth` from html (index.css), which
        // would otherwise animate this back into view instead of snapping.
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
        });
      }
    };
  }, [locked]);
}
