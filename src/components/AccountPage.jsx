import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ArrowLeft, ShieldCheck, LogOut, UserRound, Bell, Lock, Shield,
  Gift, Copy, Share2, Check, Calendar, Store, TrendingUp, ChevronRight,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const springPhysics = { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 };
const softSpring = { type: 'spring', stiffness: 240, damping: 26 };

/* Animated count-up */
function CountUp({ value = 0 }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.9, ease: 'easeOut' });
    const unsubscribe = rounded.on('change', v => setDisplay(v));
    return () => { controls.stop(); unsubscribe(); };
  }, [value, count, rounded]);

  return <>{display}</>;
}

/* Animated verified ring around avatar */
function VerifiedRing({ active }) {
  if (!active) return null;
  return (
    <>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          border: '2px solid #22C55E',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...springPhysics, delay: 0.3 }}
        style={{
          position: 'absolute',
          right: 2, bottom: 2,
          width: 26, height: 26, borderRadius: '50%',
          background: '#22C55E', color: 'white',
          display: 'grid', placeItems: 'center',
          border: '3px solid white',
          boxShadow: '0 3px 10px rgba(34,197,94,.4)',
        }}
      >
        <ShieldCheck size={13} />
      </motion.div>
    </>
  );
}

export default function AccountPage({
  session, onBack, onOpenSettings, onSignOut, onOpenAdmin, isAdmin,
  onOpenNotifications, onOpenPrivacy,
}) {
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [refStats, setRefStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [listingCount, setListingCount] = useState(0);
  const copyTimerRef = useRef(null);

  const loadProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    const [profileRes, listingsRes, refRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, business_name, avatar_url, is_verified, shop_plan_expires_at, created_at')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', session.user.id)
        .eq('status', 'active'),
      supabase.rpc('get_referral_stats'),
    ]);

    if (!profileRes.error) setProfile(profileRes.data || null);
    if (!listingsRes.error) setListingCount(listingsRes.count || 0);
    if (refRes.data?.success) setRefStats(refRes.data);
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.user?.id) { setProfileLoading(false); return; }
      setProfileLoading(true);
      await loadProfile();
      if (!cancelled) setProfileLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadProfile, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`account-live:${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        () => loadProfile()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'referrals', filter: `referrer_id=eq.${session.user.id}` },
        () => loadProfile()
      )
      .subscribe();

    const poll = setInterval(() => loadProfile(), 45000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [session?.user?.id, loadProfile]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function copyInviteLink() {
    if (!refStats?.code) return;
    const url = `${window.location.origin}/invite/${refStats.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2200);
    } catch {}
  }

  async function shareInvite() {
    if (!refStats?.code) return;
    const url = `${window.location.origin}/invite/${refStats.code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join CampusFlip',
          text: 'Get MK 200 off your first listing on CampusFlip.',
          url,
        });
      } catch {}
    } else {
      copyInviteLink();
    }
  }

  const shopPlanExpiry = profile?.shop_plan_expires_at
    ? new Date(profile.shop_plan_expires_at)
    : null;
  const shopPlanActive = Boolean(
    profile?.is_verified && shopPlanExpiry && shopPlanExpiry.getTime() > Date.now()
  );

  const displayName = profile?.display_name || session?.user?.user_metadata?.display_name || 'CampusFlip Member';
  const businessName = profile?.business_name?.trim();
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');

  const memberSince = useMemo(() => {
    const created = profile?.created_at || session?.user?.created_at;
    if (!created) return null;
    return new Date(created).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }, [profile?.created_at, session?.user?.created_at]);

  const referralCode = refStats?.code;

  if (profileLoading) {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          minHeight: '100vh',
          padding: 'calc(24px + env(safe-area-inset-top)) 16px 120px',
          maxWidth: 600,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <span className="cf-block-loader" />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.65 }}
          transition={{ delay: 0.3 }}
          style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600 }}
        >
          Loading your account…
        </motion.span>
      </motion.main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPhysics}
      className="cf-account-page"
      style={{
        minHeight: '100vh',
        padding: 'calc(24px + env(safe-area-inset-top)) 16px 120px',
        maxWidth: 600,
        margin: '0 auto',
        color: '#101C3A',
      }}
    >
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 'calc(env(safe-area-inset-top) + 8px)',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '-8px -8px 24px',
          padding: '10px 8px',
          borderRadius: 16,
          background: 'rgba(245,248,255,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          style={iconButton}
          aria-label="Back"
        >
          <ArrowLeft size={19} />
        </motion.button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Account</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8' }}>
            Your CampusFlip identity
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springPhysics, delay: 0.05 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 20px 24px',
          marginBottom: 20,
          borderRadius: 26,
          background: 'linear-gradient(145deg, #ffffff 0%, #F5F8FF 100%)',
          border: '1px solid #E5EAF2',
          boxShadow: '0 12px 40px rgba(16,28,58,.07)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 280, height: 280,
          background: shopPlanActive
            ? 'radial-gradient(circle, rgba(34,197,94,.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(37,99,235,.10) 0%, transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 16, zIndex: 1 }}>
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...springPhysics, delay: 0.1 }}
            style={{
              width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
              display: 'grid', placeItems: 'center',
              background: '#E5EDFB', color: '#2563EB',
              border: '4px solid white',
              boxShadow: '0 8px 24px rgba(16,28,58,.15)',
              fontSize: 30, fontWeight: 800,
            }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </motion.div>
          <VerifiedRing active={shopPlanActive} />
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springPhysics, delay: 0.15 }}
          style={{ margin: 0, fontSize: 21, fontWeight: 800, textAlign: 'center', letterSpacing: '-0.4px', zIndex: 1 }}
        >
          {displayName}
        </motion.h2>

        {businessName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ margin: '4px 0 0', fontSize: 13, color: '#2563EB', fontWeight: 700 }}
          >
            {businessName}
          </motion.p>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22 }}
          style={{ margin: '6px 0 0', fontSize: 12, color: '#94A3B8' }}
        >
          {session?.user?.email}
        </motion.p>

        {shopPlanActive && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...springPhysics, delay: 0.28 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 14, padding: '6px 12px',
              borderRadius: 20, background: '#DCFCE7', color: '#15803D',
              fontSize: 11, fontWeight: 800,
            }}
          >
            <ShieldCheck size={13} /> Verified Seller
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springPhysics, delay: 0.3 }}
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 20,
            paddingTop: 18,
            borderTop: '1px solid #E5EAF2',
            width: '100%',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#101C3A' }}>{listingCount}</div>
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Active listings
            </div>
          </div>
          {memberSince && (
            <>
              <div style={{ width: 1, background: '#E5EAF2' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#101C3A' }}>{memberSince}</div>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Member since
                </div>
              </div>
            </>
          )}
          {refStats && refStats.referrals > 0 && (
            <>
              <div style={{ width: 1, background: '#E5EAF2' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#101C3A' }}>{refStats.referrals}</div>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {refStats.referrals === 1 ? 'Referral' : 'Referrals'}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.section>

      {/* Referral Credits Hero */}
      <AnimatePresence>
        {refStats && referralCode && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ ...springPhysics, delay: 0.1 }}
            style={{
              padding: 22,
              marginBottom: 20,
              borderRadius: 22,
              background: 'linear-gradient(135deg, #FFF8E6 0%, #FFE9B8 100%)',
              border: '1px solid #F0D9A5',
              boxShadow: '0 10px 28px rgba(245,166,35,.10)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: -30, right: -30,
                width: 120, height: 120,
                background: 'radial-gradient(circle, rgba(245,166,35,.35) 0%, transparent 70%)',
                filter: 'blur(20px)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, position: 'relative' }}>
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springPhysics, delay: 0.2 }}
                style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: '#F5A623',
                  color: '#101C3A',
                  display: 'grid', placeItems: 'center',
                  flexShrink: 0,
                  boxShadow: '0 8px 20px rgba(245,166,35,.35)',
                }}
              >
                <Gift size={22} />
              </motion.div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 15, color: '#101C3A', letterSpacing: '-0.2px' }}>
                  Invite friends, earn credits
                </b>
                <div style={{ fontSize: 12, color: '#805B00', marginTop: 3, fontWeight: 600 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#805B00' }}>
                    <CountUp value={refStats.credits || 0} />
                  </span>
                  {' '}
                  {refStats.credits === 1 ? 'free listing' : 'free listings'}
                  {refStats.referrals > 0 && (
                    <span style={{ opacity: 0.7 }}> · {refStats.referrals} {refStats.referrals === 1 ? 'friend invited' : 'friends invited'}</span>
                  )}
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 14px',
                background: 'rgba(255,255,255,.7)',
                borderRadius: 13,
                fontSize: 12,
                fontWeight: 700,
                color: '#101C3A',
                marginBottom: 12,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,.95)',
                position: 'relative',
              }}
            >
              <Sparkles size={14} color="#805B00" style={{ flexShrink: 0 }} />
              <span style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                letterSpacing: '-0.2px',
              }}>
                campusflip.app/invite/{referralCode}
              </span>
            </motion.div>

            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={copyInviteLink}
                style={{
                  flex: 1,
                  padding: 12,
                  border: '1px solid rgba(16,28,58,.12)',
                  borderRadius: 12,
                  background: copied ? '#22C55E' : 'rgba(255,255,255,.85)',
                  color: copied ? 'white' : '#101C3A',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'background 0.25s, color 0.25s',
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="copied"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Check size={14} /> Copied!
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Copy size={14} /> Copy link
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={shareInvite}
                style={{
                  flex: 1,
                  padding: 12,
                  border: 0,
                  borderRadius: 12,
                  background: '#F5A623',
                  color: '#101C3A',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(245,166,35,.3)',
                }}
              >
                <Share2 size={14} /> Share
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Actions */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } }}
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <MenuButton
          icon={<UserRound size={19} />}
          label="Edit Profile"
          sublabel="Name, picture, and WhatsApp"
          onClick={onOpenSettings}
        />
        <MenuButton
          icon={<Bell size={19} />}
          label="Notifications"
          sublabel="Choose what you want to hear about"
          onClick={onOpenNotifications}
        />
        <MenuButton
          icon={<Lock size={19} />}
          label="Privacy & Security"
          sublabel="Password, sessions, and account"
          onClick={onOpenPrivacy}
        />

        {isAdmin && (
          <MenuButton
            icon={<Shield size={19} />}
            label="Admin Dashboard"
            sublabel="Manage reports and users"
            onClick={onOpenAdmin}
            danger
          />
        )}
      </motion.div>

      {/* Sign Out */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springPhysics, delay: 0.4 }}
        style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #E5EAF2' }}
      >
        <motion.button
          className="cf-signout-row"
          whileHover={{ scale: 1.01, background: '#FEF2F2' }}
          whileTap={{ scale: 0.97 }}
          onClick={onSignOut}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px',
            border: '1px solid #FCE8E8',
            borderRadius: 14,
            background: '#fff',
            color: '#B42318',
            fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <LogOut size={16} /> Sign out
        </motion.button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          margin: '24px 0 0',
          textAlign: 'center',
          fontSize: 11,
          color: '#94A3B8',
          fontWeight: 600,
          letterSpacing: 1.5,
        }}
      >
        CAMPUSFLIP · BUY. SELL. MEET.
      </motion.p>
    </motion.main>
  );
}

function MenuButton({ icon, label, sublabel, onClick, disabled, danger }) {
  return (
    <motion.button
      className="cf-menu-row"
      variants={{
        hidden: { opacity: 0, x: -12 },
        show: { opacity: 1, x: 0, transition: springPhysics },
      }}
      whileHover={disabled ? {} : { scale: 1.01, background: danger ? '#FEE2E2' : '#F8FBFF' }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px',
        border: '1px solid #E5EAF2',
        borderRadius: 16,
        background: danger ? '#FEF2F2' : '#fff',
        color: danger ? '#B42318' : '#101C3A',
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <motion.span
        whileHover={disabled ? {} : { scale: 1.08, rotate: -5 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
          width: 38, height: 38, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          borderRadius: 12,
          background: danger ? 'rgba(180,35,24,.08)' : 'rgba(37,99,235,.08)',
          color: danger ? '#B42318' : '#2563EB',
        }}
      >
        {icon}
      </motion.span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 14 }}>{label}</strong>
        <small style={{ display: 'block', fontSize: 11, color: danger ? '#B42318' : '#94A3B8', marginTop: 2, opacity: 0.85 }}>
          {sublabel}
        </small>
      </span>
      <ChevronRight
        size={14}
        style={{
          opacity: 0.4,
          transform: disabled ? 'none' : 'translateX(0)',
        }}
      />
    </motion.button>
  );
}

const iconButton = {
  width: 38, height: 38,
  border: '1px solid #E5EAF2', borderRadius: 12,
  background: 'white', color: '#101C3A',
  display: 'grid', placeItems: 'center', cursor: 'pointer',
};