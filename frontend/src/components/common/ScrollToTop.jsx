import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Sends the window back to the top when the route changes.
 *
 * Browsers keep the scroll offset across a client-side navigation, because nothing about
 * the document changed as far as they are concerned. React Router does not reset it either
 * — <ScrollRestoration> exists but only works under a data router, and this app uses plain
 * <Routes>. So opening a product from halfway down the shop dropped you halfway down the
 * product page, which on a phone reads as the page having opened at the bottom.
 *
 * Three things it deliberately does NOT do:
 *
 *  • It ignores back and forward. Returning to the shop should put you back where you were
 *    in the list, not at the top — the browser already restores that, and overriding it is
 *    the usual way this fix ends up making navigation worse than it was.
 *  • It ignores everything but the pathname, so changing a filter or a query string on the
 *    shop does not yank the page upward mid-browse.
 *  • It leaves a #hash alone, since the point of one is to land somewhere specific.
 *
 * useLayoutEffect rather than useEffect: this runs before the browser paints, so the new
 * page never flashes at the old offset on its way to the top.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === 'POP') return;
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
