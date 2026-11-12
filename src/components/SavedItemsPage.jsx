import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Trash2, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from './EmptyState';

const money = n => `MK ${Number(n || 0).toLocaleString('en-US')}`;
const springPhysics = { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 };

function SavedItemsPage({ session, onBack, onOpenListing, onToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  // Read-only mirror of items for realtime handler — avoids re-subscription
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Only show the loader on the first fetch. Refetches don't hide the grid.
  const hasLoadedOnce = useRef(false);

  const loadSaved = useCallback(async (silent = false) => {
    if (!session?.user?.id) return;

    if (!hasLoadedOnce.current && !silent) setLoading(true);

    const { data, error } = await supabase
      .from('saved_listings')
      .select(`
        listing_id,
        listings (
          id, title, price, kind, status,
          categories(name),
          meeting_spots(name),
          listing_photos(image_url, display_order)
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading saved items:', error);
      if (!silent) onToast?.('Could not load saved items.', 'error');
    } else {
      const mapped = (data || [])
        .map(row => {
          const listing = row.listings;
          if (!listing) return null;
          const photos = [...(listing.listing_photos || [])].sort(
            (a, b) => a.display_order - b.display_order
          );
          return {
            ...listing,
            image: photos[0]?.image_url || null,
            categoryName: Array.isArray(listing.categories)
              ? listing.categories[0]?.name
              : listing.categories?.name,
            spotName: Array.isArray(listing.meeting_spots)
              ? listing.meeting_spots[0]?.name
              : listing.meeting_spots?.name,
          };
        })
        .filter(Boolean);
      setItems(mapped);
    }

    hasLoadedOnce.current = true;
    if (!silent) setLoading(false);
  }, [session?.user?.id, onToast]);

  // Initial load — runs once per session, not on every render.
  useEffect(() => {
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // Realtime + 30s poll. Does NOT depend on loadSaved or items.
  useEffect(() => {
    if (!session?.user?.id || !supabase) return;

    const channel = supabase
      .channel(`saved-live:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_listings',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => loadSaved(true)
      )
      .subscribe();

    // Silent poll every 30s as a safety net against dropped realtime events
    const poll = setInterval(() => loadSaved(true), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function removeSaved(listingId) {
    if (!listingId || removingId === listingId) return;
    setRemovingId(listingId);

    // Optimistic: remove from the grid immediately
    const previous = items;
    setItems(current => current.filter(i => i.id !== listingId));

    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', session.user.id)
      .eq('listing_id', listingId);

    if (error) {
      setItems(previous);
      onToast?.('Could not remove item.', 'error');
    } else {
      onToast?.('Removed from saved items.');
    }

    setRemovingId(null);
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPhysics}
      style={{
        minHeight: '100vh',
        padding: 'calc(24px + env(safe-area-inset-top)) 16px 120px',
        maxWidth: 800,
        margin: '0 auto',
        color: '#101C3A',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} style={iconButton} aria-label="Back">
          <ArrowLeft size={19} />
        </motion.button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Saved Items</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8' }}>
            {items.length} {items.length === 1 ? 'item' : 'items'} bookmarked
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          gap: 16,
        }}>
          <span className="cf-block-loader"></span>
          <span style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600 }}>
            Loading your bookmarks...
          </span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          message="Tap ♥ on any listing to bookmark it here for later."
          actionLabel="Browse marketplace"
          onAction={onBack}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
          gap: 16,
        }}>
          <AnimatePresence mode="popLayout">
            {items.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={springPhysics}
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.9)',
                  borderRadius: 20,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(16,28,58,.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: item.status !== 'active' ? 0.72 : 1,
                }}
              >
                <div
                  onClick={() => onOpenListing(item)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <div style={{ aspectRatio: '4/3', background: '#EEF3FC', overflow: 'hidden', position: 'relative' }}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                        <Heart size={24} color="#9AACC8" />
                      </div>
                    )}
                    {item.status !== 'active' && (
                      <div style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        padding: '4px 9px',
                        borderRadius: 8,
                        background: item.status === 'sold'
                          ? 'rgba(21,128,61,.9)'
                          : 'rgba(148,163,184,.9)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 0.3,
                        backdropFilter: 'blur(8px)',
                      }}>
                        {item.status === 'sold'
                          ? 'SOLD'
                          : item.status === 'removed'
                          ? 'REMOVED'
                          : item.status.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '14px 14px 6px' }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {item.title}
                    </h3>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 4,
                      fontSize: 11,
                      color: '#94A3B8',
                    }}>
                      <span>{item.categoryName}</span>
                      <span>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <MapPin size={10} /> {item.spotName}
                      </span>
                    </div>
                    <b style={{
                      display: 'block',
                      marginTop: 8,
                      color: item.status === 'active' ? '#2563EB' : '#94A3B8',
                      fontSize: 16,
                    }}>
                      {item.kind === 'sale'
                        ? money(item.price)
                        : item.kind === 'free'
                        ? 'Free'
                        : item.kind === 'wanted'
                        ? 'Wanted'
                        : 'Lost & Found'}
                    </b>
                  </div>
                </div>

                <div style={{ padding: 10, marginTop: 'auto' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => removeSaved(item.id)}
                    disabled={removingId === item.id}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #FCE8E8',
                      borderRadius: 10,
                      background: removingId === item.id ? '#FDF2F2' : '#fff',
                      color: '#B42318',
                      fontWeight: 700,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: removingId === item.id ? 'wait' : 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <Trash2 size={14} />
                    {removingId === item.id ? 'Removing...' : 'Remove'}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.main>
  );
}

// memo prevents the parent from re-rendering this component when App re-renders.
export default memo(SavedItemsPage);

const iconButton = {
  width: 38,
  height: 38,
  border: '1px solid #E5EAF2',
  borderRadius: 12,
  background: 'white',
  color: '#101C3A',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
};