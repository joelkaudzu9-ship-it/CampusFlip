import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ArrowLeft, ShieldCheck, LogOut, UserRound, Bell, Lock, Shield,
  Gift, Copy, Share2, Check, Calendar, Store, TrendingUp,
  ChevronRight, Sparkles, ExternalLink, Package, ArrowUpRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './account-pages.css';

const spring = { type: 'spring', stiffness: 280, damping: 26, mass: 0.8 };

function CountUp({ value = 0 }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(count, Number(value) || 0, {
      duration: 1,
      ease: 'easeOut',
    });
    const unsubscribe = rounded.on('change', setDisplay);
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, count, rounded]);

  return <>{display}</>;
}

function VerifiedMark() {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -25 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={spring}
      className="cf-account-verified"
      title="Verified seller"
    >
      <ShieldCheck size={15} />
    </motion.span>
  );
}

function StatCard({ icon: Icon, label, value, note, accent = 'blue' }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: spring },
      }}
      className={`cf-account-stat cf-stat-${accent}`}
    >
      <div className="cf-account-stat-top">
        <span className="cf-account-stat-icon"><Icon size={18} /></span>
        <span className="cf-account-stat-label">{label}</span>
      </div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </motion.div>
  );
}

function AccountAction({ icon: Icon, title, description, onClick, tone = 'blue', delay = 0 }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="cf-account-action"
    >
      <span className={`cf-account-action-icon cf-action-${tone}`}>
        <Icon size={20} />
      </span>
      <span className="cf-account-action-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="cf-account-action-arrow">
        <ChevronRight size={18} />
      </span>
    </motion.button>
  );
}

export default function AccountPage({
  session,
  onBack,
  onOpenSettings,
  onSignOut,
  onOpenAdmin,
  isAdmin,
  onOpenNotifications,
  onOpenPrivacy,
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
      if (!session?.user?.id) {
        setProfileLoading(false);
        return;
      }

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
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        () => loadProfile()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${session.user.id}`,
        },
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
    } catch {
      // Clipboard permissions may be unavailable in some browsers.
    }
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
      } catch {
        // Sharing can be cancelled by the user.
      }
    } else {
      copyInviteLink();
    }
  }

  const shopPlanExpiry = profile?.shop_plan_expires_at
    ? new Date(profile.shop_plan_expires_at)
    : null;

  const shopPlanActive = Boolean(
    profile?.is_verified &&
    shopPlanExpiry &&
    shopPlanExpiry.getTime() > Date.now()
  );

  const displayName =
    profile?.display_name ||
    session?.user?.user_metadata?.display_name ||
    'CampusFlip Member';

  const businessName = profile?.business_name?.trim();

  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  const memberSince = useMemo(() => {
    const created = profile?.created_at || session?.user?.created_at;
    if (!created) return null;

    return new Date(created).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
    });
  }, [profile?.created_at, session?.user?.created_at]);

  const referralCode = refStats?.code;

  if (profileLoading) {
    return (
      <main className="cf-account-page cf-account-loading">
        <span className="cf-block-loader" />
        <span>Preparing your account...</span>
      </main>
    );
  }

  return (
    <motion.main
      className="cf-account-page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <header className="cf-account-topbar">
        <motion.button
          type="button"
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          className="cf-account-back"
          aria-label="Go back"
        >
          <ArrowLeft size={19} />
        </motion.button>

        <div>
          <span className="cf-account-overline">CAMPUSFLIP / PERSONAL SPACE</span>
          <h1>Your account</h1>
        </div>

        <button
          type="button"
          className="cf-account-top-action"
          onClick={onOpenSettings}
        >
          <UserRound size={16} />
          <span>Edit profile</span>
        </button>
      </header>

      <section className="cf-account-welcome">
        <div className="cf-account-welcome-copy">
          <span className="cf-account-overline">GOOD TO SEE YOU</span>
          <h2>Your corner of <em>CampusFlip.</em></h2>
          <p>Manage your identity, your shop and the way you connect with campus.</p>
        </div>

        <div className="cf-account-welcome-decoration" aria-hidden="true">
          <span className="cf-decoration-orbit cf-orbit-one" />
          <span className="cf-decoration-orbit cf-orbit-two" />
          <span className="cf-decoration-core">CF</span>
          <span className="cf-decoration-spark"><Sparkles size={18} /></span>
        </div>
      </section>

      <section className="cf-account-profile-layout">
        <motion.div
          className="cf-account-profile-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.08 }}
        >
          <div className="cf-account-profile-cover">
            <span className="cf-account-cover-label">YOUR CAMPUSFLIP ID</span>
            <span className="cf-account-cover-mark">CF.</span>
          </div>

          <div className="cf-account-profile-body">
            <div className="cf-account-avatar-wrap">
              <div className="cf-account-avatar">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt={`${displayName}'s profile`} />
                  : <span>{initials}</span>}
              </div>
              {shopPlanActive && <VerifiedMark />}
            </div>

            <div className="cf-account-identity">
              <div className="cf-account-name-line">
                <h2>{displayName}</h2>
                {shopPlanActive && <span className="cf-account-verified-text">VERIFIED</span>}
              </div>

              {businessName && (
                <p className="cf-account-business">
                  <Store size={14} /> {businessName}
                </p>
              )}

              <p className="cf-account-email">{session?.user?.email}</p>
            </div>

            <button
              type="button"
              onClick={onOpenSettings}
              className="cf-account-edit-link"
            >
              Edit details <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="cf-account-member-strip">
            <span><Calendar size={14} /> Member since {memberSince || '—'}</span>
            {shopPlanActive && (
              <span className="cf-account-member-verified">
                <ShieldCheck size={14} /> Verified seller
              </span>
            )}
          </div>
        </motion.div>

        <motion.div
          className="cf-account-stats-panel"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
          }}
        >
          <div className="cf-account-section-heading">
            <div>
              <span className="cf-account-overline">AT A GLANCE</span>
              <h3>Your activity</h3>
            </div>
            <TrendingUp size={19} />
          </div>

          <div className="cf-account-stats-grid">
            <StatCard
              icon={Package}
              label="Listings"
              value={<CountUp value={listingCount} />}
              note="Currently active"
              accent="blue"
            />
            <StatCard
              icon={Gift}
              label="Referrals"
              value={<CountUp value={refStats?.referrals || 0} />}
              note="Friends invited"
              accent="amber"
            />
            <StatCard
              icon={Sparkles}
              label="Credits"
              value={<CountUp value={refStats?.credits || 0} />}
              note="Free listings earned"
              accent="violet"
            />
          </div>
        </motion.div>
      </section>

      <AnimatePresence>
        {refStats && referralCode && (
          <motion.section
            className="cf-account-referral"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
          >
            <div className="cf-account-referral-main">
              <span className="cf-account-referral-icon"><Gift size={24} /></span>
              <div>
                <span className="cf-account-overline">PASS IT ON</span>
                <h3>Good things are better shared.</h3>
                <p>
                  Invite friends to CampusFlip and earn free listing credits.
                  {refStats.referrals > 0
                    ? ` You've already invited ${refStats.referrals} ${refStats.referrals === 1 ? 'friend' : 'friends'}.`
                    : ' Your first invitation is just a link away.'}
                </p>
              </div>
            </div>

            <div className="cf-account-referral-credit">
              <strong><CountUp value={refStats.credits || 0} /></strong>
              <span>{refStats.credits === 1 ? 'free listing' : 'free listings'}</span>
            </div>

            <div className="cf-account-referral-bottom">
              <div className="cf-account-referral-link">
                <Sparkles size={15} />
                <span>campusflip.app/invite/{referralCode}</span>
              </div>

              <div className="cf-account-referral-actions">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={copyInviteLink}
                  className={`cf-account-copy ${copied ? 'is-copied' : ''}`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy invite link'}
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={shareInvite}
                  className="cf-account-share"
                >
                  <Share2 size={16} /> Share invitation
                </motion.button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="cf-account-management">
        <div className="cf-account-section-heading">
          <div>
            <span className="cf-account-overline">ACCOUNT MANAGEMENT</span>
            <h3>Make yourself at home.</h3>
          </div>
          <span className="cf-account-section-note">YOUR SETTINGS</span>
        </div>

        <div className="cf-account-actions-grid">
          <AccountAction
            icon={UserRound}
            title="Personal details"
            description="Your name, profile picture and shop contact."
            onClick={onOpenSettings}
            tone="blue"
            delay={0.04}
          />
          <AccountAction
            icon={Bell}
            title="Notifications"
            description="Choose the updates you want to receive."
            onClick={onOpenNotifications}
            tone="amber"
            delay={0.09}
          />
          <AccountAction
            icon={Lock}
            title="Privacy & security"
            description="Password, sessions and account protection."
            onClick={onOpenPrivacy}
            tone="violet"
            delay={0.14}
          />
          {isAdmin && (
            <AccountAction
              icon={Shield}
              title="Admin dashboard"
              description="Manage reports, users and platform activity."
              onClick={onOpenAdmin}
              tone="rose"
              delay={0.19}
            />
          )}
        </div>
      </section>

      <footer className="cf-account-footer">
        <div>
          <span className="cf-account-footer-mark">CF.</span>
          <span>Buy. Sell. Meet.</span>
        </div>
        <button type="button" onClick={onSignOut}>
          <LogOut size={16} /> Sign out
        </button>
      </footer>
    </motion.main>
  );
}