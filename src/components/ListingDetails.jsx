import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, MapPin,
  ShieldCheck, Image as ImageIcon, LoaderCircle,
  MessageCircle, Flag, AlertCircle, Bookmark,
  Share2, Navigation, Calendar, Zap, ArrowLeft,
  Eye, Heart,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { trackListingView } from '../lib/trackView';

const money = value => `MK ${Number(value || 0).toLocaleString('en-US')}`;
const springPhysics = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 };

function relation(value) {
  return Array.isArray(value) ? value[0] : value;
}

function whatsappNumber(value) {
  let number = String(value || '').replace(/\D/g, '');
  if (number.startsWith('0')) number = `265${number.slice(1)}`;
  else if (!number.startsWith('265')) number = `265${number}`;
  return number;
}

const reportReasons = [
  'Possible scam or fraud',
  'Misleading or false information',
  'Inappropriate content',
  'Prohibited or illegal item',
  'Safety concern',
  'Duplicate listing',
  'Other'
];

export default function ListingDetails({ listing, onClose, onToast, onRequireAuth, replayToken }) {
  const [details, setDetails] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [error, setError] = useState('');
  const [contacting, setContacting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [flashDeal, setFlashDeal] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);

  const [showLightbox, setShowLightbox] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const listingId = listing?.id;
  const thumbsRef = useRef(null);
  const scrollRef = useRef(null);
  const lastReplayTokenRef = useRef(0);

  useEffect(() => {
    setImageLoaded(false);
  }, [photoIndex, listingId]);

  useEffect(() => {
    let mounted = true;
    async function checkSavedStatus() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || !listingId) { if (mounted) setIsSaved(false); return; }

      const { data, error } = await supabase
        .from('saved_listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle();

      if (!mounted) return;
      if (!error) setIsSaved(Boolean(data));
    }
    checkSavedStatus();
    return () => { mounted = false; };
  }, [listingId]);

  async function toggleBookmark() {
    if (savingBookmark || !listingId) return;
    setSavingBookmark(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { onToast?.('Please sign in to save listings.', 'error'); return; }

      if (isSaved) {
        const { error } = await supabase
          .from('saved_listings')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        if (error) throw error;
        setIsSaved(false);
        onToast?.('Removed from saved.');
      } else {
        const { error } = await supabase
          .from('saved_listings')
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) throw error;
        setIsSaved(true);
        onToast?.('Saved for later.');
      }
    } catch (err) {
      console.error('Bookmark update failed:', err);
      onToast?.(err.code === '42501' ? 'You cannot save your own listing.' : 'Could not update saved listings.', 'error');
    } finally {
      setSavingBookmark(false);
    }
  }

  async function shareListing() {
    if (sharing) return;
    setSharing(true);
    try {
      const shareUrl = `${window.location.origin}/?listing=${details.id}`;
      const shareText = `Check out "${details.title}" on CampusFlip!`;
      if (navigator.share) {
        await navigator.share({ title: details.title, text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        onToast?.('Link copied. Share it with a friend!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') onToast?.('Could not share the listing.', 'error');
    } finally {
      setSharing(false);
    }
  }

  function openInMaps() {
    if (!details?.spotName) return;
    const query = encodeURIComponent(`${details.spotName}, KUHeS, Blantyre, Malawi`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }

  useEffect(() => {
    if (!listing?.id) { setLoading(false); return; }
    let cancelled = false;

    async function loadDetails() {
      setLoading(true);
      setError('');
      setPhotoIndex(0);
      setSeller(null);
      setDetails(null);
      setFlashDeal(null);
      setShowReport(false);
      setReportReason('');
      setReportDetails('');
      setReportError('');
      setDescriptionExpanded(false);

      try {
        const { data, error: queryError } = await supabase
          .from('listings')
          .select(`
            id, seller_id, title, description, price, kind,
            status, created_at, expires_at, views_count,
            categories(name),
            meeting_spots(name),
            listing_photos(image_url, display_order)
          `)
          .eq('id', listing.id)
          .eq('status', 'active')
          .maybeSingle();

        if (cancelled) return;
        if (queryError || !data) {
          setError(queryError?.message || 'This listing is no longer available.');
          return;
        }

        const now = new Date().toISOString();
        const { data: dealData } = await supabase
          .from('flash_deals')
          .select('id, original_price, deal_price, starts_at, ends_at')
          .eq('listing_id', data.id)
          .eq('is_active', true)
          .lte('starts_at', now)
          .gt('ends_at', now)
          .order('ends_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!cancelled) setFlashDeal(dealData || null);

        const photos = [...(data.listing_photos || [])].sort((a, b) => a.display_order - b.display_order);
        setDetails({
          ...data,
          categoryName: relation(data.categories)?.name || 'Other',
          spotName: relation(data.meeting_spots)?.name || 'Campus',
          photos
        });

        trackListingView(data.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, business_name, is_verified, avatar_url, created_at')
          .eq('id', data.seller_id)
          .maybeSingle();

        if (!cancelled) setSeller(profile || null);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load this listing.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDetails();
    return () => { cancelled = true; };
  }, [listing?.id]);

  const contactSeller = useCallback(async () => {
    if (!details || contacting) return;

    const { data: authData } = await supabase.auth.getSession();
    if (!authData?.session) {
      onRequireAuth?.({
        title: details.title,
        image: details.photos?.[0]?.image_url || null,
        seller,
        spotName: details.spotName
      });
      return;
    }

    const newTab = window.open('about:blank', '_blank');
    if (newTab) newTab.opener = null;
    setContacting(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) throw new Error('Please sign in before contacting a seller.');

      const { data, error: rpcError } = await supabase.rpc('get_listing_seller_whatsapp', { p_listing_id: details.id });
      if (rpcError) throw rpcError;

      const phone = whatsappNumber(data);
      if (!phone || phone.length < 10) throw new Error('The seller has not provided a valid WhatsApp number.');

      const message = encodeURIComponent(
        flashDeal
          ? `Hello! I found your Flash Deal "${details.title}" on CampusFlip, advertised at ${money(flashDeal.deal_price)} instead of ${money(flashDeal.original_price)}. Is it still available at this price?`
          : `Hello! I found your listing "${details.title}" on CampusFlip. Is it still available?`
      );

      const url = `https://wa.me/${phone}?text=${message}`;
      if (newTab) newTab.location.href = url;
      else window.location.href = url;
    } catch (err) {
      if (newTab) newTab.close();
      onToast?.(err.message || 'Could not open WhatsApp. Please try again.', 'error');
    } finally {
      setContacting(false);
    }
  }, [details, contacting, seller, flashDeal, onRequireAuth, onToast]);

  useEffect(() => {
    if (replayToken && replayToken !== lastReplayTokenRef.current && details) {
      lastReplayTokenRef.current = replayToken;
      contactSeller();
    }
  }, [replayToken, details, contactSeller]);

  async function submitReport(event) {
    event.preventDefault();
    if (!details || !reportReason || submittingReport) return;
    setSubmittingReport(true);
    setReportError('');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) throw new Error('Please sign in before reporting a listing.');
      const reporterId = sessionData.session.user.id;
      if (reporterId === details.seller_id) throw new Error('You cannot report your own listing.');

      const { error: insertError } = await supabase.from('reports').insert({
        listing_id: details.id,
        reporter_id: reporterId,
        reason: reportReason,
        details: reportDetails.trim() || null,
        status: 'pending'
      });
      if (insertError) throw insertError;

      onToast?.('Thank you. Your report has been submitted.');
      setShowReport(false);
      setReportReason('');
      setReportDetails('');
    } catch (err) {
      setReportError(err.message || 'Your report could not be submitted.');
    } finally {
      setSubmittingReport(false);
    }
  }

  const goToPhoto = useCallback((index) => {
    setPhotoIndex(index);
    if (thumbsRef.current) {
      const child = thumbsRef.current.children[index];
      if (child) child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  function handleTouchStart(e) { setTouchStartX(e.touches[0].clientX); }

  function handleTouchEnd(e) {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 60 && (details?.photos?.length || 0) > 1) {
      if (deltaX > 0) goToPhoto((photoIndex + details.photos.length - 1) % details.photos.length);
      else goToPhoto((photoIndex + 1) % details.photos.length);
    }
    setTouchStartX(null);
  }

  // ── Swipe-down-to-dismiss: only when scroll is at top ────────────────────
  function handleDragEnd(_event, info) {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0 && (info.offset.y > 120 || info.velocity.y > 500)) {
      onClose?.();
    }
  }

  if (!listing) return null;

  const photos = details?.photos || [];
  const currentPhoto = photos[photoIndex]?.image_url;

  const kindLabels = {
    sale: details?.price != null ? money(details.price) : '',
    wanted: 'Wanted',
    free: 'Free',
    lost_found: 'Lost & Found'
  };

  const memberSince = seller?.created_at
    ? new Date(seller.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : null;

  const discountPercent = flashDeal
    ? Math.round((1 - Number(flashDeal.deal_price) / Number(flashDeal.original_price)) * 100)
    : 0;

  const displayPrice = flashDeal ? flashDeal.deal_price : details?.price;
  const originalPrice = flashDeal ? flashDeal.original_price : null;

  const descriptionLong = (details?.description || '').length > 200;
  const showFullDescription = descriptionExpanded || !descriptionLong;

  const sellerInitials = (seller?.business_name || seller?.display_name || 'C')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

  return (
    <AnimatePresence>
      <motion.div
        key="listing-details-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          background: 'rgba(16, 28, 58, .55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <motion.div
          ref={scrollRef}
          initial={{ y: 55, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 45, opacity: 0 }}
          transition={springPhysics}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.55 }}
          onDragEnd={handleDragEnd}
          onClick={event => event.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 680,
            maxHeight: '96dvh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            position: 'relative',
            background: '#F5F8FF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            boxShadow: '0 -20px 80px rgba(16,28,58,.3)',
            color: '#101C3A',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
        >
          {loading ? (
            <div
              style={{
                minHeight: '60dvh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: 40,
              }}
            >
              <span className="cf-block-loader"></span>
              <span style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600 }}>
                Loading listing...
              </span>
            </div>
          ) : error ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#B42318', minHeight: '60dvh', display: 'grid', placeItems: 'center' }}>
              <div>
                <AlertCircle size={40} style={{ marginBottom: 12, marginInline: 'auto' }} />
                <b style={{ display: 'block', marginBottom: 8 }}>Couldn't load this listing</b>
                <span style={{ fontSize: 13 }}>{error}</span>
              </div>
            </div>
          ) : details && (
            <>
              {/* ═══════════════════════════════════════════════════
                  HERO — image with floating price pill + actions
                  ═══════════════════════════════════════════════════ */}
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => currentPhoto && setShowLightbox(true)}
                style={{
                  position: 'relative',
                  height: 'clamp(320px, 58vh, 480px)',
                  background: '#EDF3FC',
                  overflow: 'hidden',
                  cursor: currentPhoto ? 'zoom-in' : 'default',
                }}
              >
                <AnimatePresence mode="wait">
                  {currentPhoto ? (
                    <motion.img
                      key={currentPhoto}
                      src={currentPhoto}
                      alt={details.title}
                      onLoad={() => setImageLoaded(true)}
                      initial={{ opacity: 0, scale: 1.04 }}
                      animate={{ opacity: imageLoaded ? 1 : 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'linear-gradient(135deg, #EFF5FF 0%, #E1EBFF 100%)',
                      }}
                    >
                      <ImageIcon size={64} color="#9AACC8" />
                    </div>
                  )}
                </AnimatePresence>

                {!imageLoaded && currentPhoto && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, #EEF3FC 25%, #F7FAFF 50%, #EEF3FC 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'cf-shimmer 1.5s infinite',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Bottom gradient scrim */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 'auto 0 0 0',
                    height: 180,
                    background: 'linear-gradient(to top, rgba(16,28,58,.7) 0%, rgba(16,28,58,.15) 50%, transparent 100%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* ── Drag handle pill — mobile swipe-to-dismiss affordance ── */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,.6)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    pointerEvents: 'none',
                    zIndex: 3,
                  }}
                />

                {/* Top controls — arrow (back) + X (close) + share */}
                <div
                  style={{
                    position: 'absolute',
                    top: 22,
                    left: 14,
                    right: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={(e) => { e.stopPropagation(); onClose?.(); }}
                    aria-label="Back to browsing"
                    style={heroIconButton}
                  >
                    <ArrowLeft size={19} />
                  </motion.button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={(e) => { e.stopPropagation(); shareListing(); }}
                      disabled={sharing}
                      aria-label="Share"
                      style={heroIconButton}
                    >
                      {sharing ? <LoaderCircle size={18} className="cf-spin" /> : <Share2 size={18} />}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={(e) => { e.stopPropagation(); onClose?.(); }}
                      aria-label="Close"
                      style={heroIconButton}
                    >
                      <X size={19} />
                    </motion.button>
                  </div>
                </div>

                {/* Flash deal badge — floating top-center */}
                {flashDeal && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={springPhysics}
                    style={{
                      position: 'absolute',
                      top: 78,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '6px 12px',
                      borderRadius: 20,
                      background: '#F5A623',
                      color: '#101C3A',
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: 0.3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      boxShadow: '0 6px 20px rgba(245,166,35,.4)',
                    }}
                  >
                    <Zap size={12} fill="currentColor" />
                    {discountPercent}% OFF · FLASH DEAL
                  </motion.div>
                )}

                {/* Bottom hero content — price pill + category + views */}
                <div
                  style={{
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    bottom: 16,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        alignSelf: 'flex-start',
                        padding: '4px 10px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,.9)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 0.8,
                        color: '#2563EB',
                      }}
                    >
                      {details.categoryName.toUpperCase()}
                    </span>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        padding: '8px 14px',
                        borderRadius: 16,
                        background: 'rgba(255,255,255,.94)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 24px rgba(16,28,58,.25)',
                        alignSelf: 'flex-start',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: 26, fontWeight: 900, color: '#101C3A', letterSpacing: -0.5 }}>
                        {details.kind === 'sale' ? money(displayPrice) : kindLabels[details.kind]}
                      </span>
                      {originalPrice && (
                        <span
                          style={{
                            fontSize: 13,
                            color: '#8995A8',
                            textDecoration: 'line-through',
                            fontWeight: 600,
                          }}
                        >
                          {money(originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    {details.views_count > 0 && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 9px',
                          borderRadius: 10,
                          background: 'rgba(16,28,58,.55)',
                          backdropFilter: 'blur(10px)',
                          color: 'white',
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        <Eye size={11} /> {details.views_count}
                      </span>
                    )}
                    {photos.length > 1 && (
                      <span
                        style={{
                          padding: '4px 9px',
                          borderRadius: 10,
                          background: 'rgba(16,28,58,.55)',
                          backdropFilter: 'blur(10px)',
                          color: 'white',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {photoIndex + 1} / {photos.length}
                      </span>
                    )}
                  </div>
                </div>

                {photos.length > 1 && (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPhoto((photoIndex + photos.length - 1) % photos.length);
                      }}
                      style={{ ...galleryButton, left: 12 }}
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={20} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPhoto((photoIndex + 1) % photos.length);
                      }}
                      style={{ ...galleryButton, right: 12 }}
                      aria-label="Next photo"
                    >
                      <ChevronRight size={20} />
                    </motion.button>
                  </>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════
                  TITLE STRIP
                  ═══════════════════════════════════════════════════ */}
              <div style={{ padding: '20px 16px 0' }}>
                <motion.h1
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springPhysics}
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    lineHeight: 1.25,
                    letterSpacing: -0.5,
                    margin: '0 0 14px',
                    color: '#101C3A',
                  }}
                >
                  {details.title}
                </motion.h1>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springPhysics, delay: 0.05 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 16,
                    background: seller?.is_verified
                      ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
                      : '#fff',
                    border: seller?.is_verified ? '1px solid #BFDBFE' : '1px solid #E5EAF2',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 14,
                      overflow: 'hidden',
                      display: 'grid',
                      placeItems: 'center',
                      background: '#E1EBFF',
                      color: '#2563EB',
                      fontSize: 16,
                      fontWeight: 800,
                    }}
                  >
                    {seller?.avatar_url ? (
                      <img
                        src={seller.avatar_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      sellerInitials
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <strong
                        style={{
                          fontSize: 14,
                          color: '#101C3A',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '65%',
                        }}
                      >
                        {seller?.business_name || seller?.display_name || 'CampusFlip seller'}
                      </strong>
                      {seller?.is_verified && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            color: '#2563EB',
                            fontSize: 10,
                            fontWeight: 800,
                            background: '#fff',
                            padding: '2px 6px',
                            borderRadius: 20,
                          }}
                        >
                          <ShieldCheck size={10} /> Verified
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 11,
                        color: '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {memberSince && (
                        <>
                          <Calendar size={10} /> Since {memberSince}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* ═══════════════════════════════════════════════════
                  DESCRIPTION CARD
                  ═══════════════════════════════════════════════════ */}
              {details.description && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    margin: '12px 16px 0',
                    padding: 18,
                    background: '#fff',
                    borderRadius: 18,
                    border: '1px solid #E5EAF2',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 1,
                      color: '#94A3B8',
                      marginBottom: 8,
                    }}
                  >
                    DESCRIPTION
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: '#4B5563',
                      whiteSpace: 'pre-wrap',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: showFullDescription ? 'unset' : 4,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {details.description}
                  </p>
                  {descriptionLong && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setDescriptionExpanded(v => !v)}
                      style={{
                        marginTop: 10,
                        border: 0,
                        background: 'transparent',
                        color: '#2563EB',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {descriptionExpanded ? 'Show less' : 'Read more'}
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════
                  MEETING SPOT
                  ═══════════════════════════════════════════════════ */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={openInMaps}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: 'calc(100% - 32px)',
                  margin: '12px 16px 0',
                  padding: 16,
                  background: '#fff',
                  border: '1px solid #E5EAF2',
                  borderRadius: 18,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#101C3A',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #2563EB, #1E40AF)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 8px 20px rgba(37,99,235,.3)',
                  }}
                >
                  <MapPin size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 1,
                      color: '#94A3B8',
                      marginBottom: 3,
                    }}
                  >
                    MEET HERE
                  </div>
                  <b
                    style={{
                      fontSize: 14,
                      display: 'block',
                      color: '#101C3A',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {details.spotName}
                  </b>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>
                    Tap for directions
                  </span>
                </div>
                <Navigation size={18} color="#2563EB" />
              </motion.button>

              {/* ═══════════════════════════════════════════════════
                  SAFETY NOTE
                  ═══════════════════════════════════════════════════ */}
              <div
                style={{
                  margin: '12px 16px 0',
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: '#805B00',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <ShieldCheck size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Meet in a busy spot. Never pay before seeing the item in person.
                </span>
              </div>

              {/* ═══════════════════════════════════════════════════
                  REPORT
                  ═══════════════════════════════════════════════════ */}
              <div
                style={{
                  padding: '20px 16px calc(20px + env(safe-area-inset-bottom))',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowReport(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    border: 0,
                    background: 'transparent',
                    color: '#94A3B8',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Flag size={13} /> Report this listing
                </button>
              </div>

              {/* ═══════════════════════════════════════════════════
                  STICKY ACTION BAR — WhatsApp + Save
                  ═══════════════════════════════════════════════════ */}
              <div
                style={{
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 15,
                  display: 'flex',
                  gap: 10,
                  padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                  background: 'rgba(245,248,255,.94)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderTop: '1px solid #E5EAF2',
                }}
              >
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleBookmark}
                  disabled={savingBookmark}
                  aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
                  style={{
                    width: 52,
                    height: 52,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 16,
                    border: isSaved ? '1px solid #2563EB' : '1px solid #E5EAF2',
                    background: isSaved ? '#2563EB' : '#fff',
                    color: isSaved ? '#fff' : '#101C3A',
                    cursor: savingBookmark ? 'wait' : 'pointer',
                    transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
                  }}
                >
                  {savingBookmark ? (
                    <LoaderCircle size={20} className="cf-spin" />
                  ) : (
                    <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
                  )}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={contactSeller}
                  disabled={contacting}
                  animate={{
                    boxShadow: contacting
                      ? '0 6px 18px rgba(37,211,102,.18)'
                      : [
                          '0 6px 18px rgba(37,211,102,.18)',
                          '0 10px 28px rgba(37,211,102,.35)',
                          '0 6px 18px rgba(37,211,102,.18)',
                        ],
                  }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    flex: 1,
                    minHeight: 52,
                    border: 'none',
                    borderRadius: 16,
                    background: contacting ? '#8EDDA9' : '#25D366',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 800,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    cursor: contacting ? 'wait' : 'pointer',
                  }}
                >
                  {contacting ? (
                    <LoaderCircle size={18} className="cf-spin" />
                  ) : (
                    <MessageCircle size={18} />
                  )}
                  {contacting ? 'Connecting...' : 'Chat with seller'}
                </motion.button>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              LIGHTBOX
              ═══════════════════════════════════════════════════ */}
          {typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
              {showLightbox && currentPhoto && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowLightbox(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 3000,
                    background: 'rgba(0,0,0,.96)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                  }}
                >
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowLightbox(false)}
                    aria-label="Close"
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      width: 44,
                      height: 44,
                      border: 0,
                      borderRadius: 22,
                      background: 'rgba(255,255,255,.15)',
                      backdropFilter: 'blur(20px)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={22} />
                  </motion.button>

                  <motion.img
                    key={currentPhoto}
                    src={currentPhoto}
                    alt={details?.title || ''}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={springPhysics}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: 8,
                    }}
                  />

                  {photos.length > 1 && (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPhoto((photoIndex + photos.length - 1) % photos.length);
                        }}
                        style={lightboxArrow('left')}
                        aria-label="Previous photo"
                      >
                        <ChevronLeft size={24} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPhoto((photoIndex + 1) % photos.length);
                        }}
                        style={lightboxArrow('right')}
                        aria-label="Next photo"
                      >
                        <ChevronRight size={24} />
                      </motion.button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}

          {/* ═══════════════════════════════════════════════════
              REPORT MODAL
              ═══════════════════════════════════════════════════ */}
          <AnimatePresence>
            {showReport && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReport(false);
                }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 2400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                  background: 'rgba(16,28,58,.55)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                }}
              >
                <motion.form
                  initial={{ opacity: 0, y: 22, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.95 }}
                  transition={springPhysics}
                  onSubmit={submitReport}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    maxWidth: 420,
                    padding: 26,
                    borderRadius: 24,
                    background: '#fff',
                    boxShadow: '0 30px 90px rgba(16,28,58,.3)',
                    color: '#101C3A',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 14,
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: 1.3,
                          color: '#B42318',
                          marginBottom: 6,
                        }}
                      >
                        REPORT LISTING
                      </div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 20,
                          fontWeight: 800,
                          letterSpacing: -0.4,
                        }}
                      >
                        Something wrong with this listing?
                      </h2>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => setShowReport(false)}
                      aria-label="Close"
                      style={{
                        width: 32,
                        height: 32,
                        display: 'grid',
                        placeItems: 'center',
                        border: 0,
                        borderRadius: 10,
                        background: 'rgba(16,28,58,.06)',
                        color: '#101C3A',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={16} />
                    </motion.button>
                  </div>

                  <label style={fieldLabel}>Why are you reporting this listing?</label>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    required
                    style={fieldStyle}
                  >
                    <option value="">Select a reason</option>
                    {reportReasons.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>

                  <label style={fieldLabel}>Additional details (optional)</label>
                  <textarea
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="Tell us a little more…"
                    style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  />

                  {reportError && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 7,
                        alignItems: 'flex-start',
                        color: '#B42318',
                        fontSize: 12,
                        marginBottom: 12,
                      }}
                    >
                      <AlertCircle size={16} /> {reportError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 9 }}>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => setShowReport(false)}
                      style={secondaryButton}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={!reportReason || submittingReport}
                      style={{
                        ...submitButton,
                        opacity: !reportReason || submittingReport ? 0.6 : 1,
                      }}
                    >
                      {submittingReport ? 'Submitting…' : 'Submit report'}
                    </motion.button>
                  </div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const heroIconButton = {
  width: 42,
  height: 42,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 21,
  border: '1px solid rgba(255,255,255,0.9)',
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  color: '#101C3A',
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(16,28,58,.15)',
};

const galleryButton = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 40,
  height: 40,
  display: 'grid',
  placeItems: 'center',
  border: '1px solid rgba(255,255,255,.85)',
  borderRadius: 20,
  background: 'rgba(255,255,255,.9)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  color: '#101C3A',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(16,28,58,.15)',
};

const lightboxArrow = (side) => ({
  position: 'absolute',
  [side]: 20,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 48,
  height: 48,
  border: 0,
  borderRadius: 24,
  background: 'rgba(255,255,255,.15)',
  backdropFilter: 'blur(20px)',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
});

const fieldLabel = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#4B5563',
  marginBottom: 7,
};

const fieldStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 13px',
  marginBottom: 15,
  border: '1px solid #E5EAF2',
  borderRadius: 12,
  background: 'white',
  color: '#101C3A',
  fontSize: 13,
  outlineColor: '#2563EB',
};

const secondaryButton = {
  flex: 1,
  padding: 12,
  borderRadius: 12,
  border: '1px solid #E5EAF2',
  background: 'white',
  color: '#4B5563',
  fontWeight: 700,
  cursor: 'pointer',
};

const submitButton = {
  flex: 1.5,
  padding: 12,
  borderRadius: 12,
  border: 0,
  background: '#2563EB',
  color: 'white',
  fontWeight: 800,
  cursor: 'pointer',
};