import { useEffect } from 'react';

// The mobile sidebar drawers render as a fixed, full-height overlay, but nothing
// stopped the page underneath from still scrolling - so a touch that started on
// the drawer's non-scrollable areas (like the bottom profile card) fell through
// to the page behind it, which is what caused the scroll glitch on mobile.
// `overflow: hidden` on body alone doesn't reliably stop this on iOS Safari, so
// this also pins body to the current scroll position while locked and restores
// it on unlock.
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const { body } = document;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
