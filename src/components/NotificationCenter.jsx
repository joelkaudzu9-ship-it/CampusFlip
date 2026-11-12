import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, CheckCheck, X, Sparkles, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotificationFeedback } from '../lib/useNotificationFeedback';

function timeAgo(date) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function NotificationCenter({ session, onOpenListing }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const rootRef = useRef(null);
  const { notify } = useNotificationFeedback();

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error) setNotifications(data || []);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) fetchNotifications();
    else setNotifications([]);
  }, [session?.user?.id, fetchNotifications]);

  // Realtime: new notification triggers pulse + chime
  useEffect(() => {
    if (!session?.user?.id || !supabase) return;

    const channel = supabase
      .channel(`notifications-live:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          fetchNotifications();
          notify();

          // Subtle pulse on the bell for 1.6s
          setPulse(true);
          setTimeout(() => setPulse(false), 1600);

          // Give the user a nudge in the corner too
          if (payload.new?.title) {
            // Optional: bubble up via onToast if you want a toast as well
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, fetchNotifications, notify]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  async function markAsRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.user.id);
    if (!error) {
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ));
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (!unreadIds.length) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .eq('user_id', session.user.id);
    if (!error) {
      setNotifications(prev => prev.map(n => ({
        ...n,
        read_at: n.read_at || new Date().toISOString()
      })));
    }
  }

  if (!session) return null;

  return (
    <div className="cf-notification-root" ref={rootRef}>
      <motion.button
        type="button"
        className={`cf-notification-trigger ${open ? 'is-open' : ''}`}
        onClick={() => {
          setOpen(v => !v);
          if (!open) fetchNotifications();
        }}
        aria-label="Notifications"
        animate={
          pulse
            ? { rotate: [0, -12, 10, -8, 6, -3, 0], scale: [1, 1.08, 1.04, 1.02, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={{ duration: pulse ? 0.7 : 0.25 }}
      >
        <Bell size={18} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              className="cf-notification-count"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="cf-notification-backdrop" onClick={() => setOpen(false)} />
            <motion.div
              className="cf-notification-panel"
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            >
              <div className="cf-notification-heading">
                <div>
                  <span className="cf-eyebrow" style={{ marginTop: 0 }}>CAMPUSFLIP</span>
                  <h3>Notifications</h3>
                  <p>Updates on your listings and payments.</p>
                </div>
                <button
                  type="button"
                  className="cf-icon-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                >
                  <X size={18} />
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  className="cf-mark-all"
                  onClick={markAllAsRead}
                >
                  <CheckCheck size={14} />
                  Mark all as read
                </button>
              )}

              <div className="cf-notification-list">
                {loading && notifications.length === 0 ? (
                  <div className="cf-notification-empty">
                    <div className="cf-notification-empty-icon">
                      <Sparkles size={22} />
                    </div>
                    <b>Loading notifications…</b>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="cf-notification-empty">
                    <div className="cf-notification-empty-icon">
                      <Bell size={22} />
                    </div>
                    <b>You're all caught up</b>
                    <p>We'll let you know when something happens.</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`cf-notification-item ${!n.read_at ? 'unread' : ''}`}
                    >
                      <div className="cf-notification-item-icon">
                        {n.type === 'wanted_match' ? <Target size={15} /> : <Sparkles size={15} />}
                      </div>
                      <div
                        className="cf-notification-copy"
                        style={{ cursor: n.listing_id ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (n.listing_id && onOpenListing) {
                            onOpenListing(n.listing_id);
                            if (!n.read_at) markAsRead(n.id);
                            setOpen(false);
                          }
                        }}
                      >
                        <div className="cf-notification-item-top">
                          <b>{n.title}</b>
                          {!n.read_at && <i />}
                        </div>
                        <p>{n.message}</p>
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                      {!n.read_at && (
                        <button
                          type="button"
                          className="cf-notification-read"
                          onClick={() => markAsRead(n.id)}
                          aria-label="Mark as read"
                        >
                          <Check size={13} />
                        </button>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}