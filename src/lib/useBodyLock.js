import { useEffect } from 'react';

/**
 * Lock body scroll without breaking `position: fixed` modals.
 *
 * Why not just set body { position: fixed }?
 * On mobile browsers, `position: fixed` on the body anchors fixed
 * descendants to the *document origin*, not the viewport. So a modal
 * that should appear centered in the current viewport gets pushed
 * down by however far you've scrolled.
 *
 * Setting overflow: hidden on the body freezes scroll while keeping
 * `position: fixed` elements correctly anchored to the viewport.
 */
export function useBodyLock(active) {
  useEffect(() => {
    if (!active) return;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      // Compensate for the disappearing scrollbar so the page doesn't jump
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [active]);
}