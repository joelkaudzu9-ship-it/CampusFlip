import { useEffect, useRef } from 'react';

/**
 * Hooks into the browser back button for a "page" that's really an overlay.
 *
 * When `active` becomes true:
 *  - pushes a history entry so back doesn't exit the site
 *  - on popstate, calls `onBack` instead of navigating
 *
 * When the user closes via UI (X button, back arrow), call `close()`
 * which pops the history entry via history.back().
 *
 * Pattern:
 *   const { close } = useBackButton(open, () => setOpen(false));
 *   <button onClick={close}>Close</button>
 */
export function useBackButton(active, onBack) {
  const pushedRef = useRef(false);
  const onBackRef = useRef(onBack);
  const closingViaUi = useRef(false);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active) return;

    // Push one history entry when the overlay opens
    if (!pushedRef.current) {
      window.history.pushState({ cfOverlay: true }, '');
      pushedRef.current = true;
    }

    const handlePop = () => {
      // User pressed hardware/browser back
      if (closingViaUi.current) {
        // We're the ones who triggered back() — let it go through
        closingViaUi.current = false;
        pushedRef.current = false;
        return;
      }
      // Otherwise: intercept and close the overlay
      pushedRef.current = false;
      onBackRef.current?.();
    };

    window.addEventListener('popstate', handlePop);

    return () => {
      window.removeEventListener('popstate', handlePop);

      // If we're unmounting while our entry is still on the stack
      // (e.g. parent forced unmount, navigation, etc.), clean up
      if (pushedRef.current && !closingViaUi.current) {
        pushedRef.current = false;
        // Don't call back() here — we're already tearing down
      }
    };
  }, [active]);

  // Called by UI buttons (X, back arrow) so history stays clean
  const close = () => {
    if (pushedRef.current) {
      closingViaUi.current = true;
      window.history.back();
    } else {
      onBackRef.current?.();
    }
  };

  return { close };
}