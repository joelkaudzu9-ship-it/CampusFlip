import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, CheckCircle2, AlertCircle,
  MapPin, Image as ImageIcon, Zap, Flame, Store,
  MoreHorizontal, Pencil, Trash2, Eye, Share2,
  CreditCard, LoaderCircle, X, ChevronDown, Tag, FileText, ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePaymentStatus } from '../lib/usePaymentStatus';
import { useBodyLock } from '../lib/useBodyLock';
import EmptyState from './EmptyState';
import SaleCelebration from './SaleCelebration';
import ListingImageUploader from './ListingImageUploader';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Live' },
  { value: 'pending_payment', label: 'Awaiting' },
  { value: 'sold', label: 'Sold' },
  { value: 'expired', label: 'Expired' }
];

const money = v => `MK ${Number(v || 0).toLocaleString('en-US')}`;
const statusLabels = {
  active: 'Live', pending_payment: 'Awaiting', sold: 'Sold',
  expired: 'Expired', draft: 'Draft', removed: 'Removed'
};

function relation(v) { return Array.isArray(v) ? v[0] : v; }

const spring = { type: 'spring', stiffness: 300, damping: 30 };
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } }
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.18 } }
};

const fieldStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 13px', borderRadius: 12,
  border: '1px solid #E5EAF2', background: '#fff',
  fontSize: 14, color: '#101C3A', outline: 'none'
};

const primaryButton = {
  width: '100%', border: 0, borderRadius: 14,
  padding: '14px 16px',
  background: '#2563EB',
  color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer'
};

const secondaryButton = {
  width: '100%', border: '1px solid #E5EAF2',
  borderRadius: 14, padding: 13, background: '#fff',
  color: '#4B5563', fontSize: 13, fontWeight: 700, cursor: 'pointer'
};

const iconButton = {
  width: 40, height: 40, border: '1px solid #E5EAF2',
  borderRadius: 13, background: '#fff', color: '#101C3A',
  display: 'grid', placeItems: 'center', cursor: 'pointer'
};

/* Modal shell — portaled, centered, body-locked */
function Modal({ open, onClose, children, maxWidth = 430 }) {
  useBodyLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
            background: 'rgba(16,28,58,.55)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            overscrollBehavior: 'contain',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={spring}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth,
              maxHeight: 'calc(100dvh - 40px)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              padding: 26,
              borderRadius: 26,
              background: '#fff',
              boxShadow: '0 30px 90px rgba(16,28,58,.3)',
              color: '#101C3A',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function MyShop({ session, onBack, onPostAnother, onToast }) {
  const [listings, setListings] = useState([]);
  const [shopProfile, setShopProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [saleCelebration, setSaleCelebration] = useState(null);

  // Single-slot modal state
  const [activeModal, setActiveModal] = useState(null);

  // Boost form state
  const [boostPhone, setBoostPhone] = useState('');
  const [boostOperator, setBoostOperator] = useState('airtel');
  const [boosting, setBoosting] = useState(false);
  const [boostStatus, setBoostStatus] = useState('idle');
  const [boostChargeId, setBoostChargeId] = useState(null);
  const boostKey = useRef(null);

  // Flash deal form state
  const [dealPrice, setDealPrice] = useState('');
  const [dealDuration, setDealDuration] = useState(24);
  const [dealPhone, setDealPhone] = useState('');
  const [dealOperator, setDealOperator] = useState('airtel');
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [dealStatus, setDealStatus] = useState('idle');
  const [dealChargeId, setDealChargeId] = useState(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editMeetingSpotId, setEditMeetingSpotId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCategories, setEditCategories] = useState([]);
  const [editSpots, setEditSpots] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editPhotoKey, setEditPhotoKey] = useState(0);

  const loadListings = useCallback(async () => {
    if (!session?.user?.id) { setListings([]); setLoading(false); return; }
    setLoading(true);

    const { data, error: qErr } = await supabase
      .from('listings')
      .select(`
        id, title, description, price, kind, status, is_boosted, created_at,
        category_id, meeting_spot_id, expires_at, views_count,
        categories(name), meeting_spots(name),
        listing_photos(image_url, display_order)
      `)
      .eq('seller_id', session.user.id)
      .neq('status', 'removed')
      .order('created_at', { ascending: false });

    if (qErr) {
      console.error('Load shop listings failed:', qErr);
      onToast?.('Could not load your shop. Please try again.', 'error');
      setListings([]);
    } else {
      setListings((data || []).map(row => {
        const photos = [...(row.listing_photos || [])].sort((a, b) => a.display_order - b.display_order);
        return {
          ...row,
          categoryName: relation(row.categories)?.name || 'Other',
          spotName: relation(row.meeting_spots)?.name || 'Campus',
          image: photos[0]?.image_url || null,
          photoCount: photos.length,
        };
      }));
    }
    setLoading(false);
  }, [session?.user?.id, onToast]);

  useEffect(() => { loadListings(); }, [loadListings]);

  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    const ch = supabase
      .channel(`myshop:${session.user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'listings',
        filter: `seller_id=eq.${session.user.id}`
      }, () => loadListings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.user?.id, loadListings]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session?.user?.id) { setShopProfile(null); setProfileLoading(false); return; }
      setProfileLoading(true);
      const { data, error: pErr } = await supabase
        .from('profiles')
        .select('display_name, business_name, avatar_url, is_verified, shop_plan_expires_at')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setShopProfile(pErr ? null : data || null);
      setProfileLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const shopPlanExpiry = shopProfile?.shop_plan_expires_at ? new Date(shopProfile.shop_plan_expires_at) : null;
  const shopPlanActive = Boolean(
    shopProfile?.is_verified && shopPlanExpiry && shopPlanExpiry.getTime() > Date.now()
  );
  const shopDisplayName =
    shopProfile?.business_name?.trim() ||
    shopProfile?.display_name?.trim() ||
    session?.user?.user_metadata?.display_name ||
    'Your CampusFlip Shop';

  function openModal(type, listing) {
    setActiveModal({ type, listing });
  }

  function closeModal() {
    setActiveModal(null);
  }

  function openMoreMenu(listing) {
    openModal('more', listing);
  }

  function openBoostModal(listing) {
    setBoostPhone('');
    setBoostOperator('airtel');
    setBoostStatus('idle');
    setBoostChargeId(null);
    boostKey.current = null;
    openModal('boost', listing);
  }

  function openFlashModal(listing) {
    setDealPrice('');
    setDealDuration(24);
    setDealPhone('');
    setDealOperator('airtel');
    setDealStatus('idle');
    setDealChargeId(null);
    openModal('flash', listing);
  }

  function openSoldModal(listing) {
    openModal('sold', listing);
  }

  function openDeleteModal(listing) {
    openModal('delete', listing);
  }

  async function openEditModal(listing) {
    setEditTitle(listing.title || '');
    setEditDescription(listing.description || '');
    setEditPrice(listing.price != null ? String(listing.price) : '');
    setEditMeetingSpotId(listing.meeting_spot_id || '');
    setEditCategoryId(listing.category_id || '');
    setEditError('');
    setEditSaving(false);
    setEditPhotoKey(k => k + 1);
    openModal('edit', listing);

    const [catRes, spotRes] = await Promise.all([
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('meeting_spots').select('id, name').eq('is_active', true).order('name'),
    ]);
    if (!catRes.error) setEditCategories(catRes.data || []);
    if (!spotRes.error) setEditSpots(spotRes.data || []);
  }

  async function handleDelete(listing) {
    if (!listing) return;
    setDeleting(true);
    try {
      await supabase.from('listing_photos').delete().eq('listing_id', listing.id);

      const { error: uErr } = await supabase
        .from('listings')
        .update({ status: 'removed', updated_at: new Date().toISOString() })
        .eq('id', listing.id)
        .eq('seller_id', session.user.id);

      if (uErr) throw uErr;

      setListings(prev => prev.filter(l => l.id !== listing.id));
      setActiveModal(null);
      onToast?.(`"${listing.title}" has been deleted from your shop.`, 'success');
    } catch (err) {
      console.error('Delete failed:', err);
      onToast?.(err.message || 'Could not delete the listing.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    const listing = activeModal?.type === 'edit' ? activeModal.listing : null;
    if (!listing) return;

    setEditError('');

    if (!editTitle.trim()) { setEditError('Title is required.'); return; }
    if (!editDescription.trim()) { setEditError('Description is required.'); return; }
    if (!editCategoryId) { setEditError('Category is required.'); return; }
    if (!editMeetingSpotId) { setEditError('Meeting spot is required.'); return; }

    let numericPrice = null;
    if (listing.kind === 'sale') {
      numericPrice = Number(editPrice);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        setEditError('Enter a valid price greater than MK 0.');
        return;
      }
    }

    setEditSaving(true);
    try {
      const { error: uErr } = await supabase
        .from('listings')
        .update({
          title: editTitle.trim(),
          description: editDescription.trim(),
          price: numericPrice,
          category_id: editCategoryId,
          meeting_spot_id: editMeetingSpotId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id)
        .eq('seller_id', session.user.id);

      if (uErr) throw uErr;

      setActiveModal(null);
      onToast?.('Listing updated.');
      await loadListings();
    } catch (err) {
      console.error('Edit save failed:', err);
      setEditError(err.message || 'Could not save changes.');
    } finally {
      setEditSaving(false);
    }
  }

  async function markAsSold(listing) {
    setUpdatingId(listing.id);
    const { error: uErr } = await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listing.id)
      .eq('seller_id', session.user.id);
    setUpdatingId(null);
    if (uErr) { onToast?.(uErr.message, 'error'); return; }

    setActiveModal(null);
    setSaleCelebration({
      title: listing.title,
      price: listing.kind === 'sale' ? listing.price : null
    });

    window.setTimeout(() => { loadListings(); }, 400);
  }

  async function handleBoost(e) {
    e.preventDefault();
    const listing = activeModal?.type === 'boost' ? activeModal.listing : null;
    if (!listing || boosting) return;

    setBoosting(true);

    try {
      if (!boostKey.current) boostKey.current = crypto.randomUUID();
      const { data, error: iErr } = await supabase.functions.invoke('campusflip-payment', {
        body: {
          listingId: listing.id,
          paymentType: 'boost',
          phone: boostPhone,
          operator: boostOperator,
          idempotencyKey: boostKey.current
        }
      });

      if (iErr) throw iErr;
      if (data?.error) throw new Error(data.error);
      if (!data?.charge_id) throw new Error('No payment reference.');

      setBoostStatus('waiting');
      setBoostChargeId(data.charge_id);
    } catch (err) {
      onToast?.(err.message || 'Could not initiate boost.', 'error');
      setBoosting(false);
      setBoostStatus('idle');
    }
  }

  async function handleFlash(e) {
    e.preventDefault();
    const listing = activeModal?.type === 'flash' ? activeModal.listing : null;
    if (!listing || dealSubmitting) return;

    const price = Number(dealPrice);
    if (!Number.isFinite(price) || price <= 0 || price >= Number(listing.price)) {
      onToast?.('Enter a price lower than the current listing price.', 'error');
      return;
    }

    setDealSubmitting(true);

    try {
      const { data, error: iErr } = await supabase.functions.invoke('campusflip-payment', {
        body: {
          listingId: listing.id,
          paymentType: 'flash_deal',
          dealPrice: price,
          dealDurationHours: Number(dealDuration),
          phone: dealPhone,
          operator: dealOperator,
          idempotencyKey: crypto.randomUUID()
        }
      });

      if (iErr) throw iErr;
      if (data?.error) throw new Error(data.error);
      if (!data?.charge_id) throw new Error('No payment reference.');

      setDealStatus('waiting');
      setDealChargeId(data.charge_id);
    } catch (err) {
      onToast?.(err.message || 'Could not initiate Flash Deal.', 'error');
      setDealSubmitting(false);
      setDealStatus('idle');
    }
  }

  usePaymentStatus({
    chargeId: boostChargeId,
    onStatus: status => {
      if (status === 'successful') {
        setBoostStatus('success');
        setBoosting(false);
        setListings(prev => prev.map(l =>
          l.id === activeModal?.listing?.id ? { ...l, is_boosted: true } : l
        ));
        loadListings();
        setTimeout(() => {
          setActiveModal(null);
          setBoostStatus('idle');
          setBoostPhone('');
          setBoostChargeId(null);
          boostKey.current = null;
        }, 2000);
      } else if (status === 'failed') {
        setBoostStatus('idle');
        setBoosting(false);
        setBoostChargeId(null);
        onToast?.('Payment was not successful. Please try again.', 'error');
      } else if (status === 'timeout') {
        setBoosting(false);
        setBoostChargeId(null);
        onToast?.('Payment is taking longer than expected. Check your history before retrying.', 'error');
        setBoostStatus('idle');
      }
    }
  });

  usePaymentStatus({
    chargeId: dealChargeId,
    onStatus: status => {
      if (status === 'successful') {
        setDealStatus('success');
        setDealSubmitting(false);
        onToast?.('Flash Deal activated.');
        loadListings();
        setTimeout(() => {
          setActiveModal(null);
          setDealStatus('idle');
          setDealPrice('');
          setDealPhone('');
          setDealChargeId(null);
        }, 2200);
      } else if (status === 'failed') {
        setDealStatus('idle');
        setDealSubmitting(false);
        setDealChargeId(null);
        onToast?.('Payment was not successful. Please try again.', 'error');
      } else if (status === 'timeout') {
        setDealSubmitting(false);
        setDealChargeId(null);
        onToast?.('Payment is taking longer than expected.', 'error');
        setDealStatus('idle');
      }
    }
  });

  const counts = FILTERS.reduce((acc, f) => {
    acc[f.value] = f.value === 'all'
      ? listings.length
      : listings.filter(l => l.status === f.value).length;
    return acc;
  }, {});
  const visible = filter === 'all' ? listings : listings.filter(l => l.status === filter);

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      style={{
        minHeight: '100vh',
        padding: 'calc(24px + env(safe-area-inset-top)) 16px 120px',
        maxWidth: 720, margin: '0 auto', color: '#101C3A'
      }}
    >
      {/* ── Sticky header — stays visible while the page scrolls ───────── */}
      <div
        style={{
          position: 'sticky',
          top: 'calc(env(safe-area-inset-top) + 8px)',
          zIndex: 30,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          margin: '-8px -8px 22px',
          padding: '10px 8px',
          borderRadius: 16,
          background: 'rgba(245,248,255,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} style={iconButton} aria-label="Back">
            <ArrowLeft size={19} />
          </motion.button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>My Shop</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8' }}>
              {counts.active || 0} live · {counts.pending_payment || 0} awaiting
            </p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={loadListings} disabled={loading} style={iconButton} aria-label="Refresh">
          <RefreshCw size={18} style={{ animation: loading ? 'cf-spin 1s linear infinite' : 'none' }} />
        </motion.button>
      </div>

      {/* Shop card */}
      <motion.section
        layout
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: 18,
          marginBottom: 20, border: '1px solid #E5EAF2', borderRadius: 20,
          background: 'linear-gradient(135deg, #ffffff 0%, #F5F8FF 100%)',
          boxShadow: '0 8px 24px rgba(16,28,58,.06)'
        }}
      >
        <div style={{
          width: 54, height: 54, flexShrink: 0, overflow: 'hidden',
          display: 'grid', placeItems: 'center', borderRadius: 17,
          background: '#E5EDFB', color: '#2563EB', fontSize: 20, fontWeight: 900
        }}>
          {shopProfile?.avatar_url ? (
            <img src={shopProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : shopDisplayName.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 850, overflowWrap: 'anywhere' }}>
              {profileLoading ? 'Loading your shop…' : shopDisplayName}
            </h2>
            {shopPlanActive && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}
                style={{
                  width: 19, height: 19, display: 'inline-grid', placeItems: 'center',
                  borderRadius: '50%', background: '#2563EB', color: '#fff',
                  fontSize: 12, fontWeight: 900,
                  boxShadow: '0 2px 6px rgba(37,99,235,.25)'
                }}
              >✓</motion.span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: 12 }}>
            {profileLoading ? 'Loading status…' : shopPlanActive
              ? `Verified · until ${shopPlanExpiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : 'CampusFlip seller'}
          </p>
        </div>
      </motion.section>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 16 }}>
        {FILTERS.map(f => (
          <motion.button
            whileTap={{ scale: 0.95 }}
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              flexShrink: 0, border: '1px solid',
              borderColor: filter === f.value ? '#2563EB' : '#E5EAF2',
              background: filter === f.value ? '#2563EB' : 'white',
              color: filter === f.value ? 'white' : '#4B5563',
              borderRadius: 20, padding: '8px 14px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}
          >
            {f.label} ({counts[f.value] || 0})
          </motion.button>
        ))}
      </div>

      {/* Listings */}
      {loading ? (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: 320, gap: 16
        }}>
          <span className="cf-block-loader"></span>
          <span style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600 }}>
            Loading your shop…
          </span>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Your shop is empty"
          message="Post your first item and start earning from your campus."
          actionLabel="Post an item"
          onAction={onPostAnother ?? onBack}
        />
      ) : (
        <motion.div
          layout
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 14 }}
        >
          <AnimatePresence mode="popLayout">
            {visible.map(listing => (
              <motion.article
                key={listing.id}
                layout
                variants={item}
                style={{
                  display: 'flex', flexDirection: 'column',
                  background: 'rgba(255,255,255,.94)',
                  border: '1px solid #E5EAF2',
                  borderRadius: 20,
                  boxShadow: '0 6px 20px rgba(16,28,58,.05)',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', gap: 14, padding: 14 }}>
                  <div style={{
                    width: 110, height: 110, flexShrink: 0,
                    borderRadius: 14, overflow: 'hidden',
                    background: '#EEF3FC', position: 'relative'
                  }}>
                    {listing.image ? (
                      <motion.img
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        src={listing.image} alt={listing.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                        <ImageIcon size={26} color="#9AACC8" />
                      </div>
                    )}
                    {listing.is_boosted && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        background: '#F5A623', borderRadius: 6,
                        padding: '3px 7px', fontSize: 9, fontWeight: 900,
                        display: 'flex', alignItems: 'center', gap: 2,
                        color: '#101C3A'
                      }}>
                        <Zap size={10} fill="currentColor" /> Boosted
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <h3 style={{
                        margin: 0, fontSize: 15, fontWeight: 750, lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                      }}>
                        {listing.title}
                      </h3>
                      <span style={{
                        padding: '4px 8px', borderRadius: 6, fontSize: 10,
                        fontWeight: 800, whiteSpace: 'nowrap',
                        background: listing.status === 'active' ? '#DCFCE7'
                          : listing.status === 'pending_payment' ? '#FFF7D2' : '#EEF2F8',
                        color: listing.status === 'active' ? '#15803D'
                          : listing.status === 'pending_payment' ? '#946000' : '#526078'
                      }}>
                        {statusLabels[listing.status]}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11, color: '#94A3B8' }}>
                      <span>{listing.categoryName}</span>
                      <span>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <MapPin size={10} /> {listing.spotName}
                      </span>
                      {listing.photoCount > 1 && (
                        <>
                          <span>·</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <ImageIcon size={10} /> {listing.photoCount}
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                      {listing.kind === 'sale' ? (
                        <b style={{ fontSize: 18, fontWeight: 850, color: '#2563EB' }}>{money(listing.price)}</b>
                      ) : (
                        <b style={{ fontSize: 15, fontWeight: 800, color: '#15803D' }}>
                          {listing.kind === 'free' ? 'Free' : listing.kind === 'wanted' ? 'Wanted' : 'Lost & Found'}
                        </b>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action row */}
                <div style={{
                  display: 'flex', gap: 6,
                  padding: '10px 14px 14px',
                  borderTop: '1px solid #F0F3F8'
                }}>
                  {listing.status === 'active' && (
                    <>
                      {listing.kind === 'sale' && (
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => openFlashModal(listing)}
                          style={{
                            flex: 1, border: '1px solid #CCE7DF',
                            background: '#EFFAF6', color: '#15803D',
                            borderRadius: 10, padding: '10px 8px',
                            fontSize: 12, fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 5
                          }}
                        >
                          <Flame size={14} /> Flash
                        </motion.button>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => openBoostModal(listing)}
                        style={{
                          flex: 1, border: 0,
                          background: listing.is_boosted ? 'rgba(245,166,35,0.15)' : '#F5A623',
                          color: listing.is_boosted ? '#946000' : '#101C3A',
                          borderRadius: 10, padding: '10px 8px',
                          fontSize: 12, fontWeight: 800, cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 5
                        }}
                      >
                        <Zap size={14} fill="currentColor" /> Boost
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => openMoreMenu(listing)}
                        aria-label="More actions"
                        style={{
                          width: 42, flexShrink: 0,
                          border: '1px solid #E5EAF2',
                          background: '#fff', color: '#101C3A',
                          borderRadius: 10, padding: '10px 0',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </motion.button>
                    </>
                  )}

                  {listing.status === 'pending_payment' && (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => openDeleteModal(listing)}
                        style={{
                          flex: 1, border: '1px solid #FCE8E8',
                          background: '#FEF2F2', color: '#B42318',
                          borderRadius: 10, padding: '10px 8px',
                          fontSize: 12, fontWeight: 800, cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 5
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => openEditModal(listing)}
                        style={{
                          flex: 1, border: '1px solid #E5EAF2',
                          background: '#fff', color: '#101C3A',
                          borderRadius: 10, padding: '10px 8px',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 5
                        }}
                      >
                        <Pencil size={14} /> Edit
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => openMoreMenu(listing)}
                        aria-label="More actions"
                        style={{
                          width: 42, flexShrink: 0,
                          border: '1px solid #E5EAF2',
                          background: '#fff', color: '#101C3A',
                          borderRadius: 10, padding: '10px 0',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </motion.button>
                    </>
                  )}

                  {['sold', 'expired'].includes(listing.status) && (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => openDeleteModal(listing)}
                        style={{
                          flex: 1, border: '1px solid #FCE8E8',
                          background: '#FEF2F2', color: '#B42318',
                          borderRadius: 10, padding: '10px 8px',
                          fontSize: 12, fontWeight: 800, cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 5
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => openMoreMenu(listing)}
                        aria-label="More actions"
                        style={{
                          width: 42, flexShrink: 0,
                          border: '1px solid #E5EAF2',
                          background: '#fff', color: '#101C3A',
                          borderRadius: 10, padding: '10px 0',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── More Actions Menu ─────────────────────────────────────────── */}
      <Modal
        open={activeModal?.type === 'more'}
        onClose={closeModal}
        maxWidth={380}
      >
        {activeModal?.type === 'more' && (
          <>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.3, color: '#94A3B8', marginBottom: 4 }}>
                ACTIONS FOR
              </div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>
                {activeModal.listing.title}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['active', 'pending_payment'].includes(activeModal.listing.status) && (
                <MenuAction
                  icon={<Pencil size={17} />}
                  label="Edit listing"
                  sublabel="Update details and photos"
                  onClick={() => openEditModal(activeModal.listing)}
                />
              )}

              {activeModal.listing.status === 'active' && (
                <>
                  <MenuAction
                    icon={<CheckCircle2 size={17} />}
                    label="Mark as sold"
                    sublabel="Moves to Sold section"
                    onClick={() => openSoldModal(activeModal.listing)}
                  />
                  <MenuAction
                    icon={<Share2 size={17} />}
                    label="Share listing"
                    sublabel="Send link to friends"
                    onClick={async () => {
                      const url = `${window.location.origin}/?listing=${activeModal.listing.id}`;
                      const text = `Check out "${activeModal.listing.title}" on CampusFlip!`;
                      try {
                        if (navigator.share) await navigator.share({ title: activeModal.listing.title, text, url });
                        else await navigator.clipboard.writeText(`${text}\n${url}`);
                        onToast?.('Link copied.');
                      } catch {}
                      closeModal();
                    }}
                  />
                </>
              )}

              <MenuAction
                icon={<Trash2 size={17} />}
                label="Delete listing"
                sublabel={
                  activeModal.listing.status === 'active'
                    ? activeModal.listing.is_boosted
                      ? 'Removes listing and active boost'
                      : 'Removes from marketplace'
                    : 'Permanently removes this post'
                }
                onClick={() => openDeleteModal(activeModal.listing)}
                danger
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={closeModal}
              style={{ ...secondaryButton, marginTop: 16 }}
            >
              Close
            </motion.button>
          </>
        )}
      </Modal>

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      <Modal
        open={activeModal?.type === 'edit'}
        onClose={() => { if (!editSaving) closeModal(); }}
        maxWidth={520}
      >
        {activeModal?.type === 'edit' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.3, color: '#2563EB', marginBottom: 4 }}>
                  EDIT LISTING
                </div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>
                  {activeModal.listing.title}
                </h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={closeModal}
                disabled={editSaving}
                aria-label="Close"
                style={{
                  width: 32, height: 32,
                  display: 'grid', placeItems: 'center',
                  border: 0, borderRadius: 10,
                  background: 'rgba(16,28,58,.06)',
                  color: '#101C3A', cursor: 'pointer'
                }}
              >
                <X size={16} />
              </motion.button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={14} /> Title
                </span>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  maxLength={90}
                  required
                  style={fieldStyle}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} /> Description
                </span>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  maxLength={1500}
                  rows={4}
                  required
                  style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: activeModal.listing.kind === 'sale' ? '1fr 1fr' : '1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4B5563' }}>Category</span>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={editCategoryId}
                      onChange={e => setEditCategoryId(e.target.value)}
                      required
                      style={{ ...fieldStyle, appearance: 'none', paddingRight: 38 }}
                    >
                      <option value="">Choose category</option>
                      {editCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }} />
                  </div>
                </label>

                {activeModal.listing.kind === 'sale' && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4B5563' }}>Price (MK)</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={editPrice}
                      onChange={e => setEditPrice(e.target.value)}
                      required
                      style={fieldStyle}
                    />
                  </label>
                )}
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} /> Meeting spot
                </span>
                <div style={{ position: 'relative' }}>
                  <select
                    value={editMeetingSpotId}
                    onChange={e => setEditMeetingSpotId(e.target.value)}
                    required
                    style={{ ...fieldStyle, appearance: 'none', paddingRight: 38 }}
                  >
                    <option value="">Choose meeting spot</option>
                    {editSpots.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }} />
                </div>
              </label>

              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ImageIcon size={14} /> Photos
                </div>
                <ListingImageUploader
                  key={`edit-${editPhotoKey}`}
                  listingId={activeModal.listing.id}
                  onUploaded={() => {
                    onToast?.('Photo added.');
                    loadListings();
                  }}
                />
              </div>

              {editError && (
                <div style={{
                  padding: 12, borderRadius: 10,
                  background: '#FEF2F2', color: '#B42318',
                  fontSize: 12
                }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  disabled={editSaving}
                  onClick={closeModal}
                  style={{ ...secondaryButton, flex: 1 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={editSaving}
                  style={{ ...primaryButton, flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {editSaving ? (
                    <>
                      <LoaderCircle size={15} className="cf-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </motion.button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <Modal
        open={activeModal?.type === 'delete'}
        onClose={() => { if (!deleting) closeModal(); }}
        maxWidth={400}
      >
        {activeModal?.type === 'delete' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 58, height: 58, display: 'grid', placeItems: 'center',
              margin: '0 auto 18px', borderRadius: 19,
              background: 'rgba(220,53,53,.1)', color: '#B42318'
            }}>
              <Trash2 size={26} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>
              Delete this listing?
            </h2>
            <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.6, color: '#4B5563' }}>
              <strong style={{ color: '#101C3A' }}>"{activeModal.listing.title}"</strong>
              {' '}will be permanently removed.
            </p>

            {activeModal.listing.status === 'active' && activeModal.listing.is_boosted && (
              <div style={{
                padding: 12, marginBottom: 18, borderRadius: 10,
                background: '#FFF8E6', color: '#805B00',
                fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'flex-start', gap: 8,
                textAlign: 'left'
              }}>
                <Zap size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                This listing is currently boosted. Deleting it forfeits any remaining boost time.
              </div>
            )}

            {activeModal.listing.status === 'active' && !activeModal.listing.is_boosted && (
              <p style={{ margin: '0 0 18px', fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
                If you've sold the item, consider marking it as sold instead so it stays in your history.
              </p>
            )}

            {activeModal.listing.status === 'pending_payment' && (
              <p style={{ margin: '0 0 18px', fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
                This listing was never published, so deleting it won't affect anything on the marketplace.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={deleting}
                onClick={() => handleDelete(activeModal.listing)}
                style={{
                  width: '100%', border: 0, borderRadius: 14,
                  padding: 14, background: '#B42318', color: '#fff',
                  fontSize: 14, fontWeight: 800,
                  cursor: deleting ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                {deleting ? (
                  <>
                    <LoaderCircle size={15} className="cf-spin" />
                    Deleting…
                  </>
                ) : (
                  'Yes, delete it'
                )}
              </motion.button>

              {activeModal.listing.status === 'active' && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={deleting}
                  onClick={() => openSoldModal(activeModal.listing)}
                  style={secondaryButton}
                >
                  Mark as sold instead
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={deleting}
                onClick={closeModal}
                style={{ ...secondaryButton, background: 'transparent', border: 0, color: '#94A3B8' }}
              >
                Cancel
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Boost Modal ──────────────────────────────────────────────── */}
      <Modal
        open={activeModal?.type === 'boost'}
        onClose={() => { if (!boosting && boostStatus === 'idle') closeModal(); }}
        maxWidth={410}
      >
        {activeModal?.type === 'boost' && (
          <>
            <div style={{
              width: 58, height: 58, display: 'grid', placeItems: 'center',
              borderRadius: 19, background: 'rgba(245,166,35,.15)',
              color: '#946000', marginBottom: 18
            }}>
              <Zap size={29} fill="currentColor" />
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#946000', marginBottom: 8 }}>
              BOOST LISTING
            </div>
            <h2 style={{ fontSize: 22, lineHeight: 1.25, margin: '0 0 10px', letterSpacing: '-.5px' }}>
              {activeModal.listing.is_boosted
                ? 'Extend your boost'
                : `Pin "${activeModal.listing.title}" to the top`}
            </h2>
            {activeModal.listing.kind === 'sale' && (
              <span style={{
                display: 'inline-block', background: '#DCFCE7', color: '#15803D',
                padding: '4px 10px', borderRadius: 20, fontSize: 11,
                fontWeight: 800, marginBottom: 12
              }}>
                LOYAL SELLER DISCOUNT APPLIED
              </span>
            )}
            <p style={{ fontSize: 14, lineHeight: 1.65, color: '#4B5563', margin: '0 0 22px' }}>
              Pay MK {activeModal.listing.kind === 'sale' ? '400' : '500'} to{' '}
              {activeModal.listing.is_boosted
                ? 'add another 7 days to your current boost.'
                : 'pin this item to the top for 7 days.'}
            </p>

            {boostStatus === 'idle' && (
              <form onSubmit={handleBoost} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Mobile Money Provider</span>
                  <select value={boostOperator} onChange={e => setBoostOperator(e.target.value)} style={fieldStyle}>
                    <option value="airtel">Airtel Money</option>
                    <option value="tnm">TNM Mpamba</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Phone Number</span>
                  <input
                    type="tel"
                    placeholder="e.g. 0991234567"
                    value={boostPhone}
                    onChange={e => setBoostPhone(e.target.value)}
                    required
                    style={fieldStyle}
                  />
                </label>
                <motion.button
                  whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={boosting}
                  style={{
                    width: '100%', border: 0, borderRadius: 15, padding: 15,
                    background: '#F5A623',
                    color: '#101C3A', fontSize: 14, fontWeight: 800,
                    cursor: boosting ? 'wait' : 'pointer',
                    boxShadow: '0 8px 20px rgba(245,166,35,.25)',
                    opacity: boosting ? 0.7 : 1
                  }}
                >
                  {boosting ? 'Sending prompt…' : `Pay MK ${activeModal.listing.kind === 'sale' ? '400' : '500'} Now`}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }} type="button"
                  disabled={boosting}
                  onClick={closeModal}
                  style={secondaryButton}
                >
                  Cancel
                </motion.button>
              </form>
            )}

            {boostStatus === 'waiting' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                  <span className="cf-block-loader"></span>
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>Waiting for confirmation…</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>
                  Check your phone and enter your PIN to authorise the payment.
                </p>
              </div>
            )}

            {boostStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
                style={{ textAlign: 'center', padding: '20px 0' }}
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.1 }}
                  style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'rgba(21,128,61,.1)', color: '#15803D',
                    display: 'grid', placeItems: 'center', margin: '0 auto 14px'
                  }}
                >
                  <CheckCircle2 size={32} />
                </motion.div>
                <h3 style={{ margin: '0 0 6px', fontSize: 17, color: '#15803D' }}>Boost activated!</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#4B5563' }}>
                  Your listing is pinned to the top for 7 days.
                </p>
              </motion.div>
            )}
          </>
        )}
      </Modal>

      {/* ── Flash Deal Modal ──────────────────────────────────────────── */}
      <Modal
        open={activeModal?.type === 'flash'}
        onClose={() => { if (!dealSubmitting && dealStatus !== 'waiting') closeModal(); }}
        maxWidth={430}
      >
        {activeModal?.type === 'flash' && (
          <>
            <div style={{
              width: 54, height: 54, display: 'grid', placeItems: 'center',
              borderRadius: 17, background: '#EAF8F2', color: '#15803D', marginBottom: 16
            }}>
              <Flame size={27} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.3, color: '#15803D', marginBottom: 7 }}>
              CREATE FLASH DEAL
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>{activeModal.listing.title}</h2>
            <p style={{ margin: '0 0 18px', color: '#4B5563', fontSize: 13, lineHeight: 1.5 }}>
              Advertise a temporary price drop. Buyers contact you directly.
            </p>

            {dealStatus === 'idle' && (
              <form onSubmit={handleFlash} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div style={{
                  padding: 12, borderRadius: 12, background: '#F3F7FD',
                  display: 'flex', justifyContent: 'space-between', fontSize: 13
                }}>
                  <span style={{ color: '#4B5563' }}>Current price</span>
                  <b>{money(activeModal.listing.price)}</b>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  Your deal price (MK)
                  <input
                    type="number" min="1" max={Number(activeModal.listing.price) - 1} step="1"
                    required value={dealPrice} onChange={e => setDealPrice(e.target.value)}
                    placeholder="Enter reduced price" style={fieldStyle}
                  />
                </label>
                {Number(dealPrice) > 0 && Number(dealPrice) < Number(activeModal.listing.price) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ padding: 12, borderRadius: 12, background: '#EFFAF6', color: '#15803D', fontSize: 13 }}
                  >
                    <b>{Math.round((1 - Number(dealPrice) / Number(activeModal.listing.price)) * 100)}% OFF</b>
                    <span style={{ marginLeft: 8 }}>
                      Buyers save {money(Number(activeModal.listing.price) - Number(dealPrice))}
                    </span>
                  </motion.div>
                )}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  Duration
                  <select value={dealDuration} onChange={e => setDealDuration(Number(e.target.value))} style={fieldStyle}>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>3 days</option>
                  </select>
                </label>
                <div style={{
                  padding: 12, borderRadius: 12, background: '#FFF8E6',
                  color: '#805B00', fontSize: 12, display: 'flex',
                  justifyContent: 'space-between', fontWeight: 600
                }}>
                  <span>Promotion fee</span><b>MK 300</b>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  Provider
                  <select value={dealOperator} onChange={e => setDealOperator(e.target.value)} style={fieldStyle}>
                    <option value="airtel">Airtel Money</option>
                    <option value="tnm">TNM Mpamba</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  Phone Number
                  <input
                    type="tel" required value={dealPhone} onChange={e => setDealPhone(e.target.value)}
                    placeholder="e.g. 0991234567" style={fieldStyle}
                  />
                </label>
                <motion.button
                  whileTap={{ scale: 0.98 }} type="submit"
                  disabled={dealSubmitting || !dealPrice || Number(dealPrice) >= Number(activeModal.listing.price)}
                  style={{ ...primaryButton, opacity: dealSubmitting || !dealPrice ? 0.6 : 1 }}
                >
                  {dealSubmitting ? 'Sending prompt…' : 'Pay MK 300 & Activate'}
                </motion.button>
                <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={closeModal} style={secondaryButton}>
                  Cancel
                </motion.button>
              </form>
            )}

            {dealStatus === 'waiting' && (
              <div style={{ textAlign: 'center', padding: '22px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <span className="cf-block-loader"></span>
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>Waiting for payment…</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>
                  Approve the prompt on your phone.
                </p>
              </div>
            )}

            {dealStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={spring}
                style={{ textAlign: 'center', padding: '22px 0' }}
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.1 }}
                  style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'rgba(21,128,61,.1)', color: '#15803D',
                    display: 'grid', placeItems: 'center', margin: '0 auto 14px'
                  }}
                >
                  <CheckCircle2 size={32} />
                </motion.div>
                <h3 style={{ margin: '0 0 6px', fontSize: 17, color: '#15803D' }}>Flash Deal activated!</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#4B5563' }}>
                  Discounted price is live for the selected duration.
                </p>
              </motion.div>
            )}
          </>
        )}
      </Modal>

      {/* ── Sold Confirmation ─────────────────────────────────────────── */}
      <Modal
        open={activeModal?.type === 'sold'}
        onClose={() => { if (!updatingId) closeModal(); }}
        maxWidth={400}
      >
        {activeModal?.type === 'sold' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 58, height: 58, display: 'grid', placeItems: 'center',
              margin: '0 auto 18px', borderRadius: 19,
              background: 'rgba(37,99,235,.1)', color: '#2563EB'
            }}>
              <CheckCircle2 size={28} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800 }}>Mark as sold?</h2>
            <p style={{ margin: '0 0 22px', fontSize: 14, lineHeight: 1.6, color: '#4B5563' }}>
              <strong style={{ color: '#101C3A' }}>{activeModal.listing.title}</strong> will move
              from the marketplace to your Sold section.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={!!updatingId}
                onClick={() => markAsSold(activeModal.listing)}
                style={primaryButton}
              >
                {updatingId ? 'Updating…' : 'Yes, mark as sold'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={!!updatingId}
                onClick={closeModal}
                style={secondaryButton}
              >
                Keep it listed
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      {typeof document !== 'undefined' && createPortal(
        <SaleCelebration
          key={saleCelebration?.title ?? 'none'}
          sale={saleCelebration}
          onClose={() => setSaleCelebration(null)}
          onPostAnother={() => { setSaleCelebration(null); onPostAnother?.(); }}
        />,
        document.body
      )}
    </motion.main>
  );
}

function MenuAction({ icon, label, sublabel, onClick, danger }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        border: danger ? '1px solid #FCE8E8' : '1px solid #E5EAF2',
        borderRadius: 14,
        background: danger ? '#FEF2F2' : '#fff',
        color: danger ? '#B42318' : '#101C3A',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <span style={{
        width: 40,
        height: 40,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 12,
        background: danger ? 'rgba(180,35,24,.08)' : 'rgba(37,99,235,.08)',
        color: danger ? '#B42318' : '#2563EB',
      }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 14 }}>{label}</strong>
        <small style={{ display: 'block', fontSize: 11, color: danger ? '#B42318' : '#94A3B8', marginTop: 2, opacity: 0.85 }}>
          {sublabel}
        </small>
      </span>
    </motion.button>
  );
}