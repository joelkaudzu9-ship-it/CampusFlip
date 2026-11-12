import AuthPanel from './components/AuthPanel';
import { AnimatedModal, AnimatedTabs, MotionButton } from './components/MotionUI';
import ToastViewport from './components/ToastViewport';
import PostListingModal from './components/PostListingModal';
import NotificationCenter from './components/NotificationCenter';
import MyShop from './components/MyShop';
import ListingDetails from './components/ListingDetails';
import AccountSettings from './components/AccountSettings';
import AdminDashboard from './components/AdminDashboard';
import SavedItemsPage from './components/SavedItemsPage';
import AccountPage from './components/AccountPage';
import EmptyState from './components/EmptyState';
import PageTransition from './components/PageTransition';
import Onboarding from './components/Onboarding';
import ContactSellerModal from './components/ContactSellerModal';
import InvitePage from './components/InvitePage';
import NotificationPreferences from './components/NotificationPreferences';
import PrivacySecurity from './components/PrivacySecurity';
import SearchPage from './components/SearchPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import InstallPrompt from './components/InstallPrompt';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, ChevronDown,
  ShoppingBasket, BookOpen, Laptop, Shirt, Utensils,
  MoreHorizontal, Flame, Store, Users, Heart, Plus,
  UserRound, MapPin, Zap, ArrowRight, ArrowLeft,
  X, Home, Bookmark, ShieldCheck, Clock3, LoaderCircle,
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useBackButton } from './lib/useBackButton';
import './premium.css';

const PAGE_SIZE = 30;

const cats = [
  ['All', ShoppingBasket],
  ['Books', BookOpen],
  ['Electronics', Laptop],
  ['Clothes', Shirt],
  ['Food', Utensils],
  ['More', MoreHorizontal]
];

const categoryMatches = {
  Books: ['books', 'books & study materials'],
  Electronics: ['electronics'],
  Clothes: ['clothes', 'clothing & fashion'],
  Food: ['food', 'food & groceries'],
  More: ['accommodation', 'services', 'furniture & appliances',
    'beauty & personal care', 'sports & fitness', 'other']
};

const money = n => `MK ${Number(n || 0).toLocaleString('en-US')}`;

function relation(value) {
  return Array.isArray(value) ? value[0] : value;
}

function mapListing(row, seller) {
  const category = relation(row.categories);
  const spot = relation(row.meeting_spots);
  const photos = [...(row.listing_photos || [])].sort(
    (a, b) => a.display_order - b.display_order
  );

  return {
    id: row.id,
    title: row.title,
    price: row.price,
    kind: row.kind,
    category: category?.name || 'Other',
    location: spot?.name || 'Campus',
    image: photos[0]?.image_url || null,
    badge: row.is_boosted ? 'Boosted' : '',
    isBoosted: row.is_boosted,
    sellerId: row.seller_id,
    sellerName: seller?.display_name || 'CampusFlip Seller',
    businessName: seller?.business_name || '',
    isVerified: seller?.is_verified === true,
    createdAt: row.created_at,
  };
}

const springPhysics = { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 };
const softSpring = { type: 'spring', stiffness: 200, damping: 25 };

const SORT_ORDER = ['recent', 'price_asc', 'price_desc'];
const SORT_LABELS = {
  recent: 'Recent',
  price_asc: 'Price ↑',
  price_desc: 'Price ↓'
};

/* ── Product card — no self-stagger; parent wrapper handles enter animation ── */
function ProductCard({ item, isSaved, onSave, onOpen, flashDeal }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const displayPrice = flashDeal ? flashDeal.dealPrice : item.price;

  return (
    <motion.article
      className="card cf-product-card"
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      style={{ cursor: 'pointer' }}
    >
      <div className="photo cf-product-image">
        {item.image && !imageError && (
          <>
            {!imageLoaded && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, #EEF3FC 25%, #F7FAFF 50%, #EEF3FC 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'cf-shimmer 1.5s infinite',
                }}
              />
            )}
            <motion.img
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: imageLoaded ? 1 : 0, scale: imageLoaded ? 1 : 1.05 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              src={item.image}
              alt={item.title}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => { setImageLoaded(true); setImageError(true); }}
            />
          </>
        )}
        {(!item.image || imageError) && (
          <div style={{
            width: '100%', height: '100%',
            display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, #EFF5FF 0%, #E1EBFF 100%)',
            color: '#94A3B8',
          }}>
            <ShoppingBasket size={32} />
          </div>
        )}

        {flashDeal ? (
          <label
            className="gold"
            style={{
              background: '#FFF0E5',
              color: '#D65B16',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Flame size={10} fill="currentColor" />
            {flashDeal.discountPercent}% OFF
          </label>
        ) : item.isBoosted ? (
          <label
            className="gold"
            style={{
              background: '#F5A623',
              color: '#101C3A',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            aria-label="Boosted listing"
          >
            <Zap size={10} fill="currentColor" />
            Boosted
          </label>
        ) : null}

        <motion.button
          whileTap={{ scale: 0.8 }}
          className={isSaved ? 'heart liked' : 'heart'}
          onClick={e => { e.stopPropagation(); onSave(); }}
          aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
        >
          <Heart fill={isSaved ? 'currentColor' : 'none'} />
        </motion.button>
      </div>
      <div className="info cf-product-info">
        <h3 className="cf-product-title">{item.title}</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 5,
          marginTop: 6,
          fontSize: 12,
          color: '#64748b',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
            {item.businessName || item.sellerName}
          </span>
          {item.isVerified && (
            <span
              title="Verified CampusFlip Business"
              aria-label="Verified seller"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 15,
                height: 15,
                borderRadius: '50%',
                background: '#2563EB',
                color: '#fff',
                fontSize: 10,
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
          )}
        </div>
        {item.kind === 'sale' && (
          <b className="cf-product-price">
            {money(displayPrice)}
            {flashDeal && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#8995A8', textDecoration: 'line-through', marginLeft: 6 }}>
                {money(item.price)}
              </span>
            )}
          </b>
        )}
        {item.kind === 'wanted' && <b className="cf-product-price">Wanted</b>}
        {item.kind === 'free' && <b className="cf-product-price">Free</b>}
        {item.kind === 'lost_found' && <b className="cf-product-price">Lost & Found</b>}
        <p className="cf-product-meta"><MapPin />{item.location}</p>
      </div>
    </motion.article>
  );
}

export default function App() {
  const [cat, setCat] = useState('All');
  const [tab, setTab] = useState('Marketplace');
  const [sort, setSort] = useState('recent');
  const [saved, setSaved] = useState([]);
  const [deal, setDeal] = useState(0);
  const [flashDeals, setFlashDeals] = useState([]);
  const [dealNow, setDealNow] = useState(Date.now());
  const [dealHovered, setDealHovered] = useState(false);
  const [dealFocused, setDealFocused] = useState(false);
  const [dealCycleKey, setDealCycleKey] = useState(0);
  const [showAllDeals, setShowAllDeals] = useState(false);
  const [toast, setToast] = useState(null);
  const [nav, setNav] = useState('Home');
  const [session, setSession] = useState(null);
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [showMyShop, setShowMyShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSavedPage, setShowSavedPage] = useState(false);
  const [showAccountPage, setShowAccountPage] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [refreshListings, setRefreshListings] = useState(0);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // ── Password reset page ──────────────────────────────────────────────────
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [inviteCode, setInviteCode] = useState(() => {
    if (typeof window === 'undefined') return null;
    const match = window.location.pathname.match(/^\/invite\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  });

  // On mount, if URL has ?listing=<id>, open that listing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('listing');
    if (!listingId) return;

    (async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(`id, seller_id, title, price, kind, status, is_boosted, created_at,
                 categories(name, slug), meeting_spots(name),
                 listing_photos(image_url, display_order)`)
        .eq('id', listingId)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) {
        ping('This listing is no longer available.', 'error');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      let seller = null;
      if (data.seller_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, business_name, is_verified')
          .eq('id', data.seller_id)
          .maybeSingle();
        seller = profile;
      }

      setSelectedListing(mapListing(data, seller));
      window.history.replaceState({}, '', window.location.pathname);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('campusflip_onboarded');
  });

  const [contactIntent, setContactIntent] = useState(null);
  const pendingContact = useRef(null);
  const [contactReplayToken, setContactReplayToken] = useState(0);
  const [contactReplyId, setContactReplyId] = useState(null);

  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const refreshDebounceRef = useRef(null);

  // Back button handling — prevents hardware back from exiting the site
  const accountBack = useBackButton(showAccountPage, () => { setShowAccountPage(false); setNav('Home'); });
  const settingsBack = useBackButton(showSettings, () => { setShowSettings(false); });
  const savedBack = useBackButton(showSavedPage, () => { setShowSavedPage(false); setNav('Home'); });
  const shopBack = useBackButton(showMyShop, () => { setShowMyShop(false); setNav('Home'); });
  const searchBack = useBackButton(showSearchPage, () => { setShowSearchPage(false); });
  const notifPrefsBack = useBackButton(showNotificationPrefs, () => { setShowNotificationPrefs(false); setShowAccountPage(true); });
  const privacyBack = useBackButton(showPrivacy, () => { setShowPrivacy(false); setShowAccountPage(true); });
  const adminBack = useBackButton(showAdmin, () => { setShowAdmin(false); setNav('Home'); });
  const listingBack = useBackButton(Boolean(selectedListing), () => setSelectedListing(null));

  // Persist invite code from URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/invite\/([a-zA-Z0-9]+)/);
    if (match) localStorage.setItem('campusflip_invite_code', match[1]);
  }, []);

  // Countdown tick for flash deals
  useEffect(() => {
    const timer = setInterval(() => setDealNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (flashDeals.length < 2) return;
    if (dealHovered || dealFocused) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setTimeout(() => {
      setDeal(c => (c + 1) % flashDeals.length);
    }, 6000);
    return () => clearTimeout(timer);
  }, [flashDeals.length, deal, dealHovered, dealFocused, dealCycleKey]);

  // Preload first 8 listing images before dropping the splash
  useEffect(() => {
    if (loading || items.length === 0) {
      if (!loading) setImagesLoaded(true);
      return;
    }
    const imageUrls = items.map(item => item.image).filter(Boolean);
    if (imageUrls.length === 0) { setImagesLoaded(true); return; }

    let loadedCount = 0;
    let cancelled = false;
    const target = Math.min(imageUrls.length, 8);
    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= target && !cancelled) setImagesLoaded(true);
    };
    const timeout = setTimeout(() => { if (!cancelled) setImagesLoaded(true); }, 2500);

    imageUrls.slice(0, 8).forEach(url => {
      const img = new Image();
      img.src = url;
      img.onload = checkDone;
      img.onerror = checkDone;
    });

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [loading, items]);

  useEffect(() => {
    if (!loading && imagesLoaded) {
      const timer = setTimeout(() => setShowSplash(false), 600);
      return () => clearTimeout(timer);
    }
  }, [loading, imagesLoaded]);

  // Auth — with PASSWORD_RECOVERY handling
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link in their email.
        // Show the reset page so they can set a new password.
        setSession(newSession);
        setShowResetPassword(true);
        return;
      }

      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Admin check
  useEffect(() => {
    async function checkAdmin() {
      if (!session?.user?.id || !supabase) { setIsAdmin(false); return; }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
      setIsAdmin(data?.is_admin === true);
    }
    checkAdmin();
  }, [session?.user?.id]);

  // Profile avatar
  useEffect(() => {
    let mounted = true;
    async function loadProfileAvatar() {
      if (!session?.user?.id || !supabase) { setProfileAvatar(''); return; }
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).maybeSingle();
      if (mounted) setProfileAvatar(data?.avatar_url || '');
    }
    loadProfileAvatar();
    return () => { mounted = false; };
  }, [session?.user?.id, profileRefresh]);

  // Saved listings
  useEffect(() => {
    let mounted = true;
    async function loadSavedListings() {
      if (!session?.user?.id || !supabase) { setSaved([]); return; }
      const { data } = await supabase.from('saved_listings').select('listing_id').eq('user_id', session.user.id);
      if (mounted) setSaved((data || []).map(item => item.listing_id));
    }
    loadSavedListings();
    return () => { mounted = false; };
  }, [session?.user?.id]);

  // Fetch one page of listings
  const fetchListingsPage = useCallback(async (offset, currentTab) => {
    let request = supabase
      .from('listings')
      .select(`id, seller_id, title, price, kind, status, is_boosted, created_at, categories(name, slug), meeting_spots(name), listing_photos(image_url, display_order)`)
      .eq('status', 'active')
      .order('is_boosted', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    request = currentTab === 'Marketplace'
      ? request.eq('kind', 'sale')
      : request.in('kind', ['wanted', 'free', 'lost_found']);

    const { data, error } = await request;
    if (error) throw error;

    const listings = data || [];
    const sellerIds = [...new Set(listings.map(item => item.seller_id).filter(Boolean))];
    let sellerProfiles = {};
    if (sellerIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, business_name, is_verified')
        .in('id', sellerIds);
      sellerProfiles = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    }

    return listings.map(row => mapListing(row, sellerProfiles[row.seller_id]));
  }, []);

  // Initial load / refresh
  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      if (!isSupabaseConfigured || !supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const mapped = await fetchListingsPage(0, tab);
        if (cancelled) return;
        setItems(mapped);
        setHasMore(mapped.length === PAGE_SIZE);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load listings.');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadListings();
    return () => { cancelled = true; };
  }, [tab, refreshListings, fetchListingsPage]);

  // Load more
  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const mapped = await fetchListingsPage(items.length, tab);
      setItems(prev => [...prev, ...mapped]);
      setHasMore(mapped.length === PAGE_SIZE);
    } catch (err) {
      console.error('Load more failed:', err);
      ping('Could not load more listings.', 'error');
    } finally {
      setLoadingMore(false);
    }
  }

  // Flash deals
  useEffect(() => {
    let cancelled = false;

    async function loadFlashDeals() {
      if (!isSupabaseConfigured || !supabase) return;
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('flash_deals')
        .select(`
          id, listing_id, original_price, deal_price, starts_at, ends_at,
          listings!inner(
            id, seller_id, title, price, kind, status, is_boosted, created_at,
            categories(name, slug), meeting_spots(name), listing_photos(image_url, display_order)
          )
        `)
        .eq('is_active', true)
        .lte('starts_at', now)
        .gt('ends_at', now)
        .eq('listings.status', 'active')
        .eq('listings.kind', 'sale')
        .order('ends_at', { ascending: true })
        .limit(15);

      if (cancelled) return;

      if (error) {
        console.error('Flash deals error:', error.message);
        setFlashDeals([]);
        return;
      }

      const records = data || [];
      const sellerIds = [
        ...new Set(records.map(r => relation(r.listings)?.seller_id).filter(Boolean))
      ];

      let sellerProfiles = {};
      if (sellerIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, business_name, is_verified')
          .in('id', sellerIds);
        sellerProfiles = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      }

      const mapped = records.map(record => {
        const listing = relation(record.listings);
        if (!listing) return null;

        const originalPrice = Number(record.original_price);
        const dealPrice = Number(record.deal_price);

        if (!Number.isFinite(originalPrice) || !Number.isFinite(dealPrice) ||
            originalPrice <= 0 || dealPrice <= 0 || dealPrice >= originalPrice) return null;

        return {
          ...mapListing(listing, sellerProfiles[listing.seller_id]),
          flashDealId: record.id,
          originalPrice,
          dealPrice,
          discountPercent: Math.round(((originalPrice - dealPrice) / originalPrice) * 100),
          startsAt: record.starts_at,
          endsAt: record.ends_at,
          isFlashDeal: true
        };
      }).filter(Boolean);

      if (!cancelled) {
        setFlashDeals(mapped);
        setDeal(current => mapped.length ? current % mapped.length : 0);
      }
    }

    loadFlashDeals();
    return () => { cancelled = true; };
  }, [refreshListings]);

  // Refetch on deal expiry
  useEffect(() => {
    if (!flashDeals.length) return;
    const nextExpiry = Math.min(...flashDeals.map(item => new Date(item.endsAt).getTime()));
    const delay = nextExpiry - dealNow;
    if (delay <= 0) { setRefreshListings(v => v + 1); return; }
    const timer = setTimeout(() => setRefreshListings(v => v + 1), delay + 1000);
    return () => clearTimeout(timer);
  }, [flashDeals, dealNow]);

  // Realtime
  const scheduleRefresh = useCallback(() => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(() => {
      setRefreshListings(v => v + 1);
      refreshDebounceRef.current = null;
    }, 400);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('public:marketplace-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_deals' }, () => scheduleRefresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new?.is_verified !== payload.old?.is_verified) scheduleRefresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
  }, [scheduleRefresh]);

  function ping(message, type = 'success') { setToast({ id: Date.now(), message, type }); }
  function dismissToast() { setToast(null); }

  function completeOnboarding() {
    localStorage.setItem('campusflip_onboarded', 'true');
    setShowOnboarding(false);
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) { ping(error.message); return; }
    setShowAccountPage(false);
    ping('You have signed out.');
  }

  function handleRequireAuth(intent) { setContactIntent(intent); }

  function handleProceedToAuth(replyId) {
    pendingContact.current = { ...contactIntent, replyId: replyId || null };
    setContactIntent(null);
    setTimeout(() => setShowAuth(true), 50);
  }

  async function save(id) {
    if (!session?.user?.id) { ping('Please sign in to save listings.', 'error'); setShowAuth(true); return; }
    const alreadySaved = saved.includes(id);
    setSaved(current => alreadySaved ? current.filter(i => i !== id) : [...current, id]);

    let error;
    if (alreadySaved) {
      ({ error } = await supabase.from('saved_listings').delete().eq('user_id', session.user.id).eq('listing_id', id));
    } else {
      ({ error } = await supabase.from('saved_listings').insert({ user_id: session.user.id, listing_id: id }));
    }

    if (error) {
      setSaved(current => alreadySaved ? [...new Set([...current, id])] : current.filter(i => i !== id));
      ping('Could not update saved listings.', 'error');
      return;
    }
    ping(alreadySaved ? 'Removed from saved items' : 'Added to saved items');
  }

  async function handleOpenListingFromNotification(listingId) {
    if (!listingId) return;

    const found = items.find(item => item.id === listingId);
    if (found) { setSelectedListing(found); return; }

    const { data, error: queryError } = await supabase
      .from('listings')
      .select(`
        id, seller_id, title, price, kind, status, is_boosted, created_at,
        categories(name, slug), meeting_spots(name),
        listing_photos(image_url, display_order)
      `)
      .eq('id', listingId)
      .eq('status', 'active')
      .maybeSingle();

    if (queryError || !data) {
      ping('This listing is no longer available.', 'error');
      return;
    }

    let seller = null;
    if (data.seller_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, business_name, is_verified')
        .eq('id', data.seller_id)
        .maybeSingle();
      seller = profile;
    }

    setSelectedListing(mapListing(data, seller));
  }

  const shown = useMemo(() => {
    const filtered = items.filter(item => {
      const matchesCategory =
        cat === 'All' ||
        (cat === 'More'
          ? categoryMatches.More?.includes(item.category.toLowerCase())
          : categoryMatches[cat]?.includes(item.category.toLowerCase()));

      const matchesVerified = !verifiedOnly || item.isVerified === true;
      return matchesCategory && matchesVerified;
    });

    if (sort === 'price_asc') {
      return [...filtered].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    if (sort === 'price_desc') {
      return [...filtered].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }
    return filtered;
  }, [items, cat, verifiedOnly, sort]);

  const activeDeal = flashDeals.length ? flashDeals[deal % flashDeals.length] : null;

  const dealTimeLeft = activeDeal
    ? Math.max(0, new Date(activeDeal.endsAt).getTime() - dealNow)
    : 0;

  const dealCountdown = [
    Math.floor(dealTimeLeft / 3600000),
    Math.floor((dealTimeLeft % 3600000) / 60000),
    Math.floor((dealTimeLeft % 60000) / 1000)
  ].map(v => String(v).padStart(2, '0')).join(':');

  const chipStyle = (active) => ({
    border: '1px solid',
    borderColor: active ? '#2563EB' : '#E5EAF2',
    background: active ? '#2563EB' : '#fff',
    color: active ? '#fff' : '#4B5563',
    borderRadius: 20,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
  });

  // ── Password reset page takes over the entire viewport ──────────────────
  if (showResetPassword) {
    return (
      <ResetPasswordPage
        onToast={ping}
        onComplete={() => {
          setShowResetPassword(false);
          // Clear the hash so refreshing doesn't re-trigger recovery
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  if (inviteCode) {
    return (
      <InvitePage
        code={inviteCode}
        onEnter={() => {
          window.history.replaceState({}, '', '/');
          setInviteCode(null);
          if (!session) setShowAuth(true);
        }}
      />
    );
  }

  return (
    <>
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}

      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="cf-splash"
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springPhysics, delay: 0.1 }}
              className="cf-splash-logo"
            >
              <span className="mark">CF</span>
              <span>Campus<span style={{ color: '#2563EB' }}>Flip</span></span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="cf-splash-tagline"
            >
              Buy. Sell. Meet.
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              style={{ marginTop: 20 }}
            >
              <span className="cf-block-loader"></span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shell">
        <header className="top cf-header">
          <a className="brand cf-brand" href="#" onClick={() => setNav('Home')}>
            <span className="mark">CF</span>
            <span><b>Campus<span>Flip</span></b><small>Buy. Sell. <em>Meet.</em></small></span>
          </a>
          <div className="actions">
            <NotificationCenter
              session={session}
              onOpenListing={handleOpenListingFromNotification}
            />
            <motion.button
              whileTap={{ scale: 0.92 }}
              className="avatar"
              onClick={() => session ? setShowAccountPage(true) : setShowAuth(true)}
              aria-label="Open account"
              style={{ padding: 0, overflow: 'hidden', display: 'grid', placeItems: 'center' }}
            >
              {profileAvatar ? (
                <img src={profileAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
              ) : (
                session?.user?.email?.[0]?.toUpperCase() || 'J'
              )}
            </motion.button>
            <ChevronDown size={16} />
          </div>
        </header>

        <div style={{ paddingTop: '80px' }}>
          <AnimatedModal open={showSettings && Boolean(session)} onClose={settingsBack.close} className="cf-account-modal">
            <AccountSettings
              session={session}
              onClose={() => { setShowSettings(false); setProfileRefresh(v => v + 1); }}
              onBack={settingsBack.close}
              onToast={ping}
            />
          </AnimatedModal>

          <div className="cf-search-area" style={{ margin: '12px 20px 0' }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSearchPage(true)}
              className="cf-search"
              style={{ width: '100%', cursor: 'pointer', textAlign: 'left' }}
              aria-label="Open search"
            >
              <Search size={18} color="#94A3B8" />
              <span style={{ flex: 1, color: '#94A3B8', fontSize: 14 }}>
                Search items on campus...
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 10,
                  background: 'rgba(37,99,235,.07)',
                  color: '#2563EB',
                }}
              >
                <SlidersHorizontal size={16} />
              </div>
            </motion.button>
          </div>

          <nav className="cats cf-categories" aria-label="Categories">
            {cats.map(([name, Icon]) => {
              const active = cat === name;
              return (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  className={`cf-category${active ? ' active' : ''}`}
                  onClick={() => setCat(name)}
                  key={name}
                  type="button"
                  aria-pressed={active}
                >
                  <Icon />
                  <span>{name}</span>
                </motion.button>
              );
            })}
          </nav>

          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '10px 20px 0',
              alignItems: 'center',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setVerifiedOnly(false)}
              style={chipStyle(!verifiedOnly)}
            >
              All sellers
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setVerifiedOnly(true)}
              style={chipStyle(verifiedOnly)}
            >
              <ShieldCheck size={13} />
              Verified
            </motion.button>

            <div style={{ width: 1, height: 20, background: '#E5EAF2', margin: '0 4px', flexShrink: 0 }} />

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const next = SORT_ORDER[(SORT_ORDER.indexOf(sort) + 1) % SORT_ORDER.length];
                setSort(next);
              }}
              style={chipStyle(sort !== 'recent')}
              aria-label={`Sort: ${SORT_LABELS[sort]}. Tap to change.`}
            >
              <Clock3 size={13} />
              {SORT_LABELS[sort]}
            </motion.button>
          </div>

          <motion.section layout className="cf-flash-section" style={{ position: 'relative', overflow: 'hidden', minHeight: '220px' }}>
            <AnimatePresence mode="wait">
              {showAllDeals ? (
                <motion.div
                  key="all-deals"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={softSpring}
                >
                  <div className="heading cf-section-heading">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowAllDeals(false)}
                        aria-label="Back to featured deal"
                        style={{
                          width: 34, height: 34,
                          border: '1px solid #E5EAF2',
                          borderRadius: 10,
                          background: '#fff',
                          color: '#101C3A',
                          display: 'grid', placeItems: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <ArrowLeft size={16} />
                      </motion.button>
                      <div style={{ minWidth: 0 }}>
                        <h2><Flame fill="currentColor" /> All Flash Deals</h2>
                        <p>{flashDeals.length} active {flashDeals.length === 1 ? 'deal' : 'deals'}</p>
                      </div>
                    </div>
                  </div>

                  {flashDeals.length === 0 ? (
                    <div className="empty cf-empty-state">
                      <Zap />
                      <b>No flash deals right now</b>
                      <span>Check back soon for special campus offers.</span>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
                      gap: 12,
                      marginTop: 16,
                    }}>
                      {flashDeals.map((fd, i) => (
                        <motion.div
                          key={fd.id}
                          initial={{ opacity: 0, y: 12, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ ...springPhysics, delay: i * 0.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedListing({ ...fd, price: fd.dealPrice, originalPrice: fd.originalPrice, isFlashDeal: true })}
                          style={{
                            background: '#fff',
                            border: '1px solid #E5EAF2',
                            borderRadius: 16,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(16,28,58,.05)',
                          }}
                        >
                          <div style={{ aspectRatio: '4/3', background: '#EEF3FC', position: 'relative', overflow: 'hidden' }}>
                            {fd.image ? (
                              <img src={fd.image} alt={fd.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#94A3B8' }}>
                                <ShoppingBasket size={28} />
                              </div>
                            )}
                            <span style={{
                              position: 'absolute', top: 8, left: 8,
                              background: '#FFF0E5', color: '#D65B16',
                              padding: '3px 8px', borderRadius: 6,
                              fontSize: 10, fontWeight: 900,
                            }}>
                              🔥 {fd.discountPercent}% OFF
                            </span>
                          </div>
                          <div style={{ padding: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {fd.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <b style={{ color: '#2563EB', fontSize: 15 }}>{money(fd.dealPrice)}</b>
                              <span style={{ fontSize: 11, color: '#8995A8', textDecoration: 'line-through' }}>
                                {money(fd.originalPrice)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="featured-deal"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={softSpring}
                >
                  <div className="heading cf-section-heading">
                    <div style={{ minWidth: 0 }}>
                      <h2><Flame fill="currentColor" /> Flash Deals</h2>
                      <p>Limited-time campus offers 🔥</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="see"
                      onClick={() => setShowAllDeals(true)}
                    >
                      See All <ArrowRight />
                    </motion.button>
                  </div>

                  {activeDeal && dealTimeLeft > 0 ? (
                    <>
                      <AnimatePresence mode="wait">
                        <motion.div
                          className="deal"
                          key={activeDeal.id}
                          onMouseEnter={() => setDealHovered(true)}
                          onMouseLeave={() => setDealHovered(false)}
                          onFocus={() => setDealFocused(true)}
                          onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) setDealFocused(false);
                          }}
                          initial={{ opacity: 0, x: 20, scale: 0.98 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -20, scale: 0.98 }}
                          transition={springPhysics}
                        >
                          {activeDeal.image && <img src={activeDeal.image} alt={activeDeal.title} loading="lazy" />}
                          <div className="shade" />
                          <div className="dealtext">
                            <b className="pill">
                              <Zap size={13} /> FLASH DEAL · {activeDeal.discountPercent}% OFF
                            </b>
                            <strong>{activeDeal.title}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <b>{money(activeDeal.dealPrice)}</b>
                              <span style={{ textDecoration: 'line-through', opacity: 0.75, fontSize: 13 }}>
                                {money(activeDeal.originalPrice)}
                              </span>
                            </div>
                            <span className="cf-deal-countdown" style={{ fontSize: 12, fontWeight: 700 }}>
                              <Zap size={13} /> Ends in {dealCountdown}
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedListing({ ...activeDeal, price: activeDeal.dealPrice, originalPrice: activeDeal.originalPrice, isFlashDeal: true })}
                            >
                              Grab Deal <ArrowRight />
                            </motion.button>
                          </div>
                          {flashDeals.length > 1 && (
                            <div className="arrows">
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={() => {
                                  setDeal(c => (c + flashDeals.length - 1) % flashDeals.length);
                                  setDealCycleKey(k => k + 1);
                                }}
                                aria-label="Previous deal"
                              >
                                ‹
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={() => {
                                  setDeal(c => (c + 1) % flashDeals.length);
                                  setDealCycleKey(k => k + 1);
                                }}
                                aria-label="Next deal"
                              >
                                ›
                              </motion.button>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                      {flashDeals.length > 1 && (
                        <div className="dots">
                          {flashDeals.map((item, index) => (
                            <motion.button
                              whileTap={{ scale: 0.8 }}
                              key={item.id}
                              className={deal % flashDeals.length === index ? 'on' : ''}
                              onClick={() => {
                                setDeal(index);
                                setDealCycleKey(k => k + 1);
                              }}
                              aria-label={`Show flash deal ${index + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="empty cf-empty-state">
                      <Zap />
                      <b>No flash deals right now</b>
                      <span>Check back soon for special campus offers.</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          <AnimatedTabs
            className="tabs cf-market-tabs cf-motion-tabs"
            value={tab}
            onChange={nextTab => { setTab(nextTab); setCat('All'); }}
            tabs={[
              { label: <><Store size={17} /> Marketplace</>, value: 'Marketplace' },
              { label: <><Users size={17} /> Wanted &amp; Free</>, value: 'Wanted & Free' }
            ]}
          />

          <div className="subhead">
            <h2>{tab === 'Marketplace' ? 'Discover on campus' : 'Wanted & Free'}</h2>
            <span>{loading ? 'Searching...' : `${shown.length}${hasMore ? '+' : ''} items`}</span>
          </div>

          {error && (
            <div className="empty">
              <X />
              <b>Couldn't load listings</b>
              <span>{error}</span>
              <button onClick={() => window.location.reload()}>Try again</button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`grid-${tab}`}
              className="grid cf-listings-grid"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
            >
              {loading ? (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 300,
                    gap: 16,
                  }}
                >
                  <span className="cf-block-loader" />
                  <span style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600 }}>
                    Finding listings...
                  </span>
                </div>
              ) : (
                shown.map((item, i) => {
                  const activeFlash = flashDeals.find(fd => fd.id === item.id);
                  const shouldStagger = i < 12;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={shouldStagger ? { opacity: 0, y: 16 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        shouldStagger
                          ? { type: 'spring', stiffness: 320, damping: 30, delay: i * 0.04 }
                          : { duration: 0.2 }
                      }
                    >
                      <ProductCard
                        item={item}
                        isSaved={saved.includes(item.id)}
                        onSave={() => save(item.id)}
                        onOpen={() => setSelectedListing(item)}
                        flashDeal={activeFlash}
                      />
                    </motion.div>
                  );
                })
              )}

              {!loading && !shown.length && (
                <EmptyState
                  icon={Search}
                  title="No matches"
                  message="Try a different category, or browse all listings."
                  actionLabel="Clear filters"
                  onAction={() => { setCat('All'); setVerifiedOnly(false); }}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {!loading && hasMore && (
            <div style={{ padding: '8px 16px 24px' }}>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  width: '100%',
                  padding: 14,
                  border: '1px solid #E5EAF2',
                  borderRadius: 14,
                  background: '#fff',
                  color: '#101C3A',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loadingMore ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(16,28,58,.04)',
                  opacity: loadingMore ? 0.7 : 1,
                }}
              >
                {loadingMore ? (
                  <>
                    <LoaderCircle size={15} className="cf-spin" />
                    Loading more…
                  </>
                ) : (
                  <>
                    Load more listings
                    <ArrowRight size={15} />
                  </>
                )}
              </motion.button>
            </div>
          )}

          {!session && (
            <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="join">
              <Users />
              <div>
                <b>Join the CampusFlip community</b>
                <span>Get the best deals, post freely!</span>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAuth(true)}>
                Sign Up <ArrowRight />
              </motion.button>
            </motion.aside>
          )}

          <motion.button
            whileTap={{ scale: 0.94 }}
            className="post cf-post-button"
            onClick={() => { if (!session) { setShowAuth(true); return; } setShowPost(true); }}
          >
            <Plus /><span>Post</span>
          </motion.button>

          <PostListingModal
            open={showPost}
            onClose={() => setShowPost(false)}
            session={session}
            onCreated={listing => {
              setRefreshListings(v => v + 1);
              ping(listing.status === 'pending_payment' ? 'Post created. Complete payment to publish it.' : 'Your post is now live!');
            }}
          />

          <nav className="bottom cf-bottom-nav">
            {[['Home', Home], ['Saved', Bookmark], ['My Shop', Store], ['Profile', UserRound]].map(([name, Icon]) => (
              <motion.button
                whileTap={{ scale: 0.9 }}
                key={name}
                className={nav === name ? 'current' : ''}
                onClick={() => {
                  setNav(name);
                  if (name === 'My Shop') { if (!session) { setShowAuth(true); return; } setShowMyShop(true); }
                  else if (name === 'Saved') { if (!session) { setShowAuth(true); return; } setShowSavedPage(true); }
                  else if (name === 'Profile') { if (!session) { setShowAuth(true); return; } setShowAccountPage(true); }
                }}
              >
                <Icon /><span>{name}</span>
              </motion.button>
            ))}
          </nav>

          <ToastViewport toast={toast} onDismiss={dismissToast} />

          <InstallPrompt />

          <AnimatedModal open={showAuth} onClose={() => setShowAuth(false)} className="cf-auth-modal">
            <div className="cf-auth-modal-heading">
              <div>
                <span className="cf-eyebrow">WELCOME TO CAMPUSFLIP</span>
                <h2>Join your campus marketplace.</h2>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} type="button" className="cf-icon-close" onClick={() => setShowAuth(false)} aria-label="Close sign in">
                <X size={19} />
              </motion.button>
            </div>
            <AuthPanel
              onToast={ping}
              onAuthenticated={async () => {
                setShowAuth(false);

                const code = localStorage.getItem('campusflip_invite_code');
                if (code) {
                  const { data, error } = await supabase.rpc('claim_referral', { p_code: code });
                  if (!error && data?.success) {
                    ping('Welcome! Your MK 200 referral credit is ready.');
                  } else {
                    ping('Welcome to CampusFlip!');
                  }
                  localStorage.removeItem('campusflip_invite_code');
                } else {
                  ping('Welcome to CampusFlip!');
                }

                const pending = pendingContact.current;
                if (pending) {
                  setContactReplyId(pending.replyId || null);
                  setTimeout(() => {
                    setContactReplayToken(t => t + 1);
                    pendingContact.current = null;
                  }, 250);
                }
              }}
            />
          </AnimatedModal>

          <AnimatePresence>
            {showAccountPage && Boolean(session) && (
              <PageTransition key="account-page" onBack={accountBack.close}>
                <AccountPage
                  session={session}
                  onBack={accountBack.close}
                  onOpenSettings={() => setShowSettings(true)}
                  onOpenNotifications={() => setShowNotificationPrefs(true)}
                  onOpenPrivacy={() => setShowPrivacy(true)}
                  onSignOut={handleSignOut}
                  onOpenAdmin={() => setShowAdmin(true)}
                  isAdmin={isAdmin}
                />
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showNotificationPrefs && Boolean(session) && (
              <PageTransition key="notif-prefs" onBack={notifPrefsBack.close}>
                <NotificationPreferences
                  session={session}
                  onBack={notifPrefsBack.close}
                  onToast={ping}
                />
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showPrivacy && Boolean(session) && (
              <PageTransition key="privacy" onBack={privacyBack.close}>
                <PrivacySecurity
                  session={session}
                  onBack={privacyBack.close}
                  onSignOut={() => {
                    setShowAccountPage(false);
                    setNav('Home');
                    privacyBack.close();
                  }}
                  onToast={ping}
                />
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showSavedPage && (
              <PageTransition key="saved-page" onBack={savedBack.close}>
                <SavedItemsPage
                  session={session}
                  onBack={savedBack.close}
                  onOpenListing={item => {
                    savedBack.close();
                    setTimeout(() => setSelectedListing(item), 0);
                  }}
                  onToast={ping}
                />
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showMyShop && (
              <PageTransition key="my-shop" onBack={shopBack.close}>
                <MyShop
                  session={session}
                  onBack={shopBack.close}
                  onPostAnother={() => {
                    shopBack.close();
                    setTimeout(() => setShowPost(true), 0);
                  }}
                  onToast={ping}
                />
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showAdmin && (
              <PageTransition key="admin-dashboard" onBack={adminBack.close}>
                <AdminDashboard session={session} onBack={adminBack.close} />
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showSearchPage && (
              <PageTransition key="search-page" onBack={searchBack.close}>
                <SearchPage
                  items={items}
                  saved={saved}
                  onSave={save}
                  onOpenListing={(item) => {
                    searchBack.close();
                    setTimeout(() => setSelectedListing(item), 0);
                  }}
                  onBack={searchBack.close}
                />
              </PageTransition>
            )}
          </AnimatePresence>

          <ListingDetails
            listing={selectedListing}
            onClose={listingBack.close}
            onToast={ping}
            onRequireAuth={handleRequireAuth}
            replayToken={contactReplayToken}
            replyId={contactReplyId}
          />

          <AnimatePresence>
            {contactIntent && (
              <ContactSellerModal
                open={!!contactIntent}
                seller={contactIntent.seller}
                listing={{
                  title: contactIntent.title,
                  image: contactIntent.image,
                  spotName: contactIntent.spotName
                }}
                onProceed={handleProceedToAuth}
                onClose={() => setContactIntent(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}