/**
 * Tracks a listing view once per browser session.
 * Prevents 1 user scrolling 10 listings from = 10 views.
 * Fire-and-forget — never blocks UI, never throws.
 */
export function trackListingView(listingId) {
  if (!listingId || typeof window === 'undefined') return;

  try {
    const key = `cf_viewed_${listingId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // sessionStorage can throw in private mode — ignore and proceed
  }

  // Fire and forget
  import('./supabase').then(({ supabase }) => {
    supabase.rpc('increment_listing_views', { p_listing_id: listingId })
      .catch(err => console.warn('View tracking failed:', err));
  });
}