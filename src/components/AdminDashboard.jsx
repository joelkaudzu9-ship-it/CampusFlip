import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  Shield, Users, Flag, CheckCircle2, ArrowLeft, LoaderCircle,
  AlertTriangle, Store, Check, TrendingUp, DollarSign,
  Search, Ban, ChevronRight, X, Phone,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBodyLock } from '../lib/useBodyLock';

const spring = { type: 'spring', stiffness: 300, damping: 30 };
const softSpring = { type: 'spring', stiffness: 240, damping: 26 };

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'users', label: 'Users', icon: Users },
];

/* Animated count-up for stat cards */
function CountUp({ value = 0, prefix = '', suffix = '' }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.9, ease: 'easeOut' });
    const unsubscribe = rounded.on('change', v => setDisplay(v));
    return () => { controls.stop(); unsubscribe(); };
  }, [value, count, rounded]);

  return <>{prefix}{display}{suffix}</>;
}

/* Fully-locked modal shell — portaled, centered, body scroll locked */
function Modal({ open, onClose, children, maxWidth = 420 }) {
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
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(7,16,42,.72)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            overscrollBehavior: 'contain',
          }}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 20, opacity: 0 }}
            transition={spring}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth,
              maxHeight: 'calc(100dvh - 40px)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              background: '#0F1B3D',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 24,
              padding: 26,
              color: 'white',
              boxShadow: '0 30px 90px rgba(0,0,0,0.5)',
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

export default function AdminDashboard({ session, onBack, onToast }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [inspectUser, setInspectUser] = useState(null);

  // ── Stable loadAll wrapped in useCallback ────────────────────────────────
  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');

    const [statsRes, reportsRes, usersRes] = await Promise.all([
      supabase.rpc('admin_dashboard_stats'),
      supabase
        .from('reports')
        .select(`
          id, reason, details, status, created_at,
          listings(id, title, seller_id),
          profiles(email, display_name, phone)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, display_name, business_name, is_verified, email, phone, created_at, avatar_url')
        .order('created_at', { ascending: false }),
    ]);

    if (statsRes.error) {
      console.error('Analytics failed:', statsRes.error.message, statsRes.error.details);
      if (!silent) setError(`Analytics failed: ${statsRes.error.message}`);
    } else {
      setAnalytics(statsRes.data);
    }

    if (reportsRes.error) {
      console.error('Reports failed:', reportsRes.error.message, reportsRes.error.details);
      if (!silent) setError(prev => prev || `Reports failed: ${reportsRes.error.message}`);
    } else {
      setReports(reportsRes.data || []);
    }

    if (usersRes.error) {
      console.error('Users failed:', usersRes.error.message, usersRes.error.details);
      if (!silent) setError(prev => prev || `Users failed: ${usersRes.error.message}`);
    } else {
      setUsers(usersRes.data || []);
    }

    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Realtime subscriptions + 60s fallback poll ──────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => loadAll(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadAll(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadAll(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => loadAll(true))
      .subscribe();

    const poll = setInterval(() => loadAll(true), 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [loadAll]);
  // ─────────────────────────────────────────────────────────────────────────

  async function handleRemoveListing(listingId, reportId) {
    if (!listingId) { onToast?.('Listing already deleted.', 'error'); return; }
    setActionLoading(reportId);

    const { error: r1 } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    const { error: r2 } = await supabase.from('listings').update({ status: 'removed' }).eq('id', listingId);

    if (r1 || r2) onToast?.(`Failed: ${(r1 || r2).message}`, 'error');
    else { onToast?.('Listing removed and report resolved.'); await loadAll(); }
    setActionLoading(null);
  }

  async function handleDismissReport(reportId) {
    setActionLoading(reportId);
    const { error: r } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
    if (r) onToast?.(`Failed: ${r.message}`, 'error');
    else { onToast?.('Report dismissed.'); await loadAll(); }
    setActionLoading(null);
  }

  async function toggleVerification(userId, currentStatus) {
    setActionLoading(userId);
    const { error: e } = await supabase.from('profiles').update({ is_verified: !currentStatus }).eq('id', userId);
    if (e) onToast?.(`Failed: ${e.message}`, 'error');
    else { onToast?.(currentStatus ? 'Verification removed.' : 'Seller verified.'); await loadAll(); }
    setActionLoading(null);
  }

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u =>
      (u.display_name || '').toLowerCase().includes(q) ||
      (u.business_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #07102A 0%, #0F1B3D 55%, #101C3A 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -200, left: -200, width: 500, height: 500, background: 'radial-gradient(circle, rgba(37,99,235,0.20) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -200, right: -200, width: 500, height: 500, background: 'radial-gradient(circle, rgba(245,166,35,0.14) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '24px 20px 80px' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={softSpring}
          style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}
        >
          <motion.button
            whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.14)' }}
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            aria-label="Back"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              width: 44, height: 44,
              color: 'white',
              cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              transition: 'background 0.2s',
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={26} color="#F5A623" /> Admin Console
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.55 }}>
              CampusFlip marketplace management
            </p>
          </div>
          <AnimatePresence>
            {pendingCount > 0 && (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={spring}
                style={{
                  background: 'rgba(220,53,53,0.15)',
                  border: '1px solid rgba(220,53,53,0.35)',
                  color: '#FF8A8A',
                  padding: '8px 14px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertTriangle size={14} /> {pendingCount} pending
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={softSpring}
              style={{
                padding: 14,
                marginBottom: 24,
                borderRadius: 14,
                background: 'rgba(220,53,53,0.15)',
                color: '#FF8A8A',
                fontSize: 13,
                border: '1px solid rgba(220,53,53,0.3)',
                overflow: 'hidden',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 28,
          background: 'rgba(255,255,255,0.05)',
          padding: 6,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {TABS.map(tab => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
                boxShadow: activeTab === tab.id ? '0 4px 14px rgba(0,0,0,0.25)' : 'none',
              }}
            >
              <tab.icon size={15} /> {tab.label}
            </motion.button>
          ))}
        </div>

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 80, gap: 16 }}
          >
            <span className="cf-block-loader" />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: 13 }}
            >
              Loading dashboard…
            </motion.span>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">

            {/* OVERVIEW */}
            {activeTab === 'overview' && analytics && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={spring}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
                  <StatCard
                    label="Revenue (all time)"
                    value={analytics.revenueTotal || 0}
                    prefix="MK "
                    sub={`MK ${(analytics.revenueLast7 || 0).toLocaleString()} this week`}
                    icon={DollarSign}
                    accent="#F5A623"
                    delay={0}
                  />
                  <StatCard
                    label="Active listings"
                    value={analytics.activeListings || 0}
                    sub={`${analytics.totalListings || 0} total`}
                    icon={Store}
                    accent="#64B5F6"
                    delay={0.05}
                  />
                  <StatCard
                    label="Members"
                    value={analytics.totalUsers || 0}
                    sub={`${analytics.verifiedShops || 0} verified · ${analytics.usersWithPhone || 0} with phone`}
                    icon={Users}
                    accent="#22C55E"
                    delay={0.1}
                  />
                  <StatCard
                    label="Pending reports"
                    value={analytics.pendingReports || 0}
                    sub={analytics.pendingReports > 0 ? 'Needs attention' : 'All clear'}
                    icon={Flag}
                    accent={analytics.pendingReports > 0 ? '#FF8A8A' : '#22C55E'}
                    delay={0.15}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <GlassCard>
                    <SectionHeader title="Revenue" sub="Last 14 days" />
                    <RevenueChart data={analytics.revenueByDay || []} />
                  </GlassCard>
                  <GlassCard>
                    <SectionHeader title="Listings by category" sub="Active only" />
                    <CategoryChart data={analytics.listingsByCategory || []} />
                  </GlassCard>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  <GlassCard>
                    <SectionHeader title="Top sellers" sub="By active listings" />
                    <TopSellers
                      sellers={analytics.topSellers || []}
                      onSelect={(id) => {
                        const u = users.find(x => x.id === id);
                        if (u) setInspectUser(u);
                      }}
                    />
                  </GlassCard>

                  <GlassCard>
                    <SectionHeader title="Payment mix" sub="Successful payments" />
                    <PaymentBreakdown data={analytics.paymentBreakdown || {}} />
                  </GlassCard>
                </div>
              </motion.div>
            )}

            {/* REPORTS */}
            {activeTab === 'reports' && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={spring}
              >
                {reports.length === 0 ? (
                  <GlassCard style={{ textAlign: 'center', padding: 60 }}>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ ...spring, delay: 0.1 }}
                    >
                      <CheckCircle2 size={48} color="#22C55E" style={{ margin: '0 auto 16px' }} />
                    </motion.div>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>All clear</h3>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: 14 }}>No listings have been reported.</p>
                  </GlassCard>
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: {},
                      show: { transition: { staggerChildren: 0.05 } },
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                  >
                    {reports.map(report => (
                      <motion.div
                        key={report.id}
                        variants={{
                          hidden: { opacity: 0, y: 12 },
                          show: { opacity: 1, y: 0, transition: spring },
                        }}
                      >
                        <GlassCard style={{ padding: 20 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
                            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FF8A8A', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, marginBottom: 8 }}>
                                <AlertTriangle size={13} /> {report.reason.toUpperCase()}
                              </div>
                              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>
                                {report.listings?.title || 'Deleted listing'}
                              </h3>
                              <p style={{ margin: 0, fontSize: 13, opacity: 0.7, lineHeight: 1.6 }}>
                                {report.details || 'No additional details provided.'}
                              </p>
                              <p style={{ margin: '10px 0 0', fontSize: 11, opacity: 0.4 }}>
                                {report.profiles?.display_name || report.profiles?.email || 'Unknown reporter'}
                                {report.profiles?.phone && ` · ${report.profiles.phone}`}
                                {' · '}
                                {new Date(report.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            {report.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
                                {report.listings?.id && (
                                  <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => handleRemoveListing(report.listings.id, report.id)}
                                    disabled={actionLoading === report.id}
                                    style={{
                                      background: 'rgba(220,53,53,0.15)',
                                      color: '#FF8A8A',
                                      border: '1px solid rgba(220,53,53,0.35)',
                                      borderRadius: 11,
                                      padding: '9px 14px',
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 5,
                                    }}
                                  >
                                    {actionLoading === report.id
                                      ? <LoaderCircle size={13} className="cf-spin" />
                                      : <Ban size={13} />}
                                    Remove
                                  </motion.button>
                                )}
                                <motion.button
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() => handleDismissReport(report.id)}
                                  disabled={actionLoading === report.id}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'rgba(255,255,255,0.7)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 11,
                                    padding: '9px 14px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Dismiss
                                </motion.button>
                              </div>
                            ) : (
                              <span style={{
                                background: report.status === 'resolved'
                                  ? 'rgba(34,197,94,0.15)'
                                  : 'rgba(255,255,255,0.08)',
                                color: report.status === 'resolved' ? '#22C55E' : 'rgba(255,255,255,0.5)',
                                padding: '8px 14px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                alignSelf: 'flex-start',
                              }}>
                                {report.status}
                              </span>
                            )}
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* USERS */}
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={spring}
              >
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={softSpring}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    marginBottom: 14,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <Search size={16} style={{ opacity: 0.5 }} />
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search by name, shop, email, or phone…"
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 0,
                      outline: 'none',
                      color: 'white',
                      fontSize: 13,
                    }}
                  />
                  <AnimatePresence>
                    {userSearch && (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        type="button"
                        onClick={() => setUserSearch('')}
                        style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}
                      >
                        <X size={14} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>

                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 10, paddingLeft: 4 }}>
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                </div>

                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.04 } },
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {filteredUsers.map(user => (
                    <motion.div
                      key={user.id}
                      variants={{
                        hidden: { opacity: 0, x: -12 },
                        show: { opacity: 1, x: 0, transition: spring },
                      }}
                      layout
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 16px',
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        style={{
                          width: 40, height: 40, borderRadius: 12,
                          background: user.avatar_url ? 'transparent' : 'rgba(255,255,255,0.1)',
                          display: 'grid', placeItems: 'center',
                          overflow: 'hidden', flexShrink: 0,
                          fontWeight: 800, fontSize: 14,
                          cursor: 'pointer',
                        }}
                        onClick={() => setInspectUser(user)}
                      >
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (user.display_name || 'A').charAt(0).toUpperCase()}
                      </motion.div>

                      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.display_name || 'Anonymous'}
                          </span>
                          {user.is_verified && <CheckCircle2 size={14} color="#22C55E" />}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.email || '—'}
                          {user.phone && ` · ${user.phone}`}
                          {user.business_name && ` · ${user.business_name}`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setInspectUser(user)}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.8)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 10,
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          Inspect <ChevronRight size={12} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleVerification(user.id, user.is_verified)}
                          disabled={actionLoading === user.id}
                          style={{
                            background: user.is_verified ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
                            color: user.is_verified ? '#22C55E' : 'rgba(255,255,255,0.7)',
                            border: user.is_verified ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 10,
                            padding: '8px 14px',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            minWidth: 88,
                            justifyContent: 'center',
                          }}
                        >
                          {actionLoading === user.id
                            ? <LoaderCircle size={13} className="cf-spin" />
                            : user.is_verified ? <><Check size={13} /> Verified</> : 'Verify'}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* User inspector */}
      <Modal open={!!inspectUser} onClose={() => setInspectUser(null)}>
        {inspectUser && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: '#F5A623', marginBottom: 4 }}>
                  USER DETAIL
                </div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                  {inspectUser.display_name || 'Anonymous'}
                </h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setInspectUser(null)}
                aria-label="Close"
                style={{ background: 'rgba(255,255,255,0.08)', border: 0, borderRadius: 10, width: 32, height: 32, color: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <X size={16} />
              </motion.button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <Row label="Email" value={inspectUser.email || '—'} icon={null} />
              <Row label="Phone" value={inspectUser.phone || 'Not provided'} icon={Phone} />
              <Row label="Shop name" value={inspectUser.business_name || '—'} icon={null} />
              <Row label="Status" value={inspectUser.is_verified ? 'Verified seller' : 'Regular member'} icon={null} />
              <Row label="Joined" value={new Date(inspectUser.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} icon={null} />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleVerification(inspectUser.id, inspectUser.is_verified).then(() => setInspectUser(null))}
              style={{
                marginTop: 22,
                width: '100%',
                padding: 14,
                borderRadius: 14,
                border: 0,
                background: inspectUser.is_verified ? 'rgba(255,255,255,0.1)' : '#22C55E',
                color: inspectUser.is_verified ? 'rgba(255,255,255,0.8)' : '#0A1A12',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {inspectUser.is_verified ? 'Remove verification' : 'Verify this seller'}
            </motion.button>
          </>
        )}
      </Modal>
    </div>
  );
}

/* ───────── Helpers ───────── */

function GlassCard({ children, style }) {
  return (
    <motion.div
      layout
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.3 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent, delay, prefix = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      whileHover={{ y: -3 }}
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 20,
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 600 }}>{label}</span>
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring, delay: delay + 0.1 }}
          style={{
            width: 30, height: 30, borderRadius: 10,
            background: `${accent}22`,
            color: accent,
            display: 'grid', placeItems: 'center',
          }}
        >
          <Icon size={15} />
        </motion.div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 6 }}>
        <CountUp value={value} prefix={prefix} />
      </div>
      <div style={{ fontSize: 11, opacity: 0.5 }}>{sub}</div>
    </motion.div>
  );
}

function RevenueChart({ data }) {
  if (!data.length) return <EmptyMini text="No payments yet." />;

  const max = Math.max(...data.map(d => d.amount), 1);

  return (
    <div style={{ position: 'relative', height: 140 }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: 4, paddingBottom: 20 }}>
        {data.map((d, i) => {
          const height = (d.amount / max) * 100;
          return (
            <motion.div
              key={d.day}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${Math.max(height, 2)}%`, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.03 }}
              whileHover={{ opacity: 0.75 }}
              title={`${d.day}: MK ${d.amount.toLocaleString()}`}
              style={{
                flex: 1,
                background: 'linear-gradient(180deg, #F5A623 0%, #D97706 100%)',
                borderRadius: 4,
                minHeight: 2,
                cursor: 'pointer',
              }}
            />
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 9, opacity: 0.4, display: 'flex', justifyContent: 'space-between' }}>
        <span>{data[0]?.day?.slice(5)}</span>
        <span>{data[data.length - 1]?.day?.slice(5)}</span>
      </div>
    </div>
  );
}

function CategoryChart({ data }) {
  if (!data.length) return <EmptyMini text="No active listings." />;
  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => {
        const width = (d.count / max) * 100;
        return (
          <div key={d.category}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
              <span style={{ fontWeight: 600 }}>{d.category}</span>
              <span style={{ opacity: 0.6 }}>{d.count}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.06 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563EB 0%, #64B5F6 100%)',
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopSellers({ sellers, onSelect }) {
  if (!sellers.length) return <EmptyMini text="No sellers with active listings yet." />;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {sellers.map((s, i) => (
        <motion.div
          key={s.id}
          variants={{
            hidden: { opacity: 0, x: -10 },
            show: { opacity: 1, x: 0, transition: spring },
          }}
          whileHover={{ x: 3, background: 'rgba(255,255,255,0.08)' }}
          onClick={() => onSelect(s.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            background: i === 0 ? '#F5A623' : 'rgba(255,255,255,0.1)',
            color: i === 0 ? '#101C3A' : 'rgba(255,255,255,0.7)',
            display: 'grid', placeItems: 'center',
            fontSize: 12, fontWeight: 800,
          }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </span>
              {s.is_verified && <CheckCircle2 size={12} color="#22C55E" />}
            </div>
            <span style={{ fontSize: 11, opacity: 0.5 }}>
              {s.active_listings} active listing{s.active_listings === 1 ? '' : 's'}
            </span>
          </div>
          <ChevronRight size={14} style={{ opacity: 0.4 }} />
        </motion.div>
      ))}
    </motion.div>
  );
}

function PaymentBreakdown({ data }) {
  const entries = Object.entries(data);
  if (!entries.length) return <EmptyMini text="No successful payments yet." />;

  const labels = {
    listing: 'Listing fee',
    boost: 'Boost',
    boost_discount: 'Boost (discounted)',
    shop_plan: 'Shop plan',
    flash_deal: 'Flash deal',
  };

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const palette = ['#F5A623', '#2563EB', '#64B5F6', '#22C55E', '#A855F7'];

  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 16 }}>
        {entries.map(([type, count], i) => (
          <motion.div
            key={type}
            initial={{ width: 0 }}
            animate={{ width: `${(count / total) * 100}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.06 }}
            style={{ background: palette[i % palette.length], height: '100%' }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map(([type, count], i) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: 0.1 + i * 0.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 3, background: palette[i % palette.length] }} />
            <span style={{ flex: 1, opacity: 0.8 }}>{labels[type] || type}</span>
            <span style={{ fontWeight: 700 }}>{count}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EmptyMini({ text }) {
  return (
    <div style={{ padding: 24, textAlign: 'center', fontSize: 12, opacity: 0.5 }}>
      {text}
    </div>
  );
}

function Row({ label, value, icon: Icon }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ opacity: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>
        {Icon && <Icon size={12} />} {label}
      </span>
      <span style={{ fontWeight: 600, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>{value}</span>
    </div>
  );
}