import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Shield, Lock, Mail, LogOut, Trash2, AlertTriangle,
  Eye, EyeOff, LoaderCircle, Check, Smartphone, Monitor, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const spring = { type: 'spring', stiffness: 300, damping: 28 };

export default function PrivacySecurity({ session, onBack, onSignOut, onToast }) {
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoadingSessions(true);
    const { data, error } = await supabase.rpc('list_active_sessions');
    if (error) {
      console.error('Sessions load failed:', error.message);
    } else if (data?.success) {
      setSessions(data.sessions || []);
    }
    setLoadingSessions(false);
  }

  async function changePassword(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      onToast?.('Password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      onToast?.('Passwords do not match.', 'error');
      return;
    }
    setChangingPwd(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      onToast?.(error.message, 'error');
    } else {
      onToast?.('Password updated successfully.');
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPwd(false);
  }

  async function changeEmail(e) {
    e.preventDefault();
    const trimmed = newEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      onToast?.('Enter a valid email address.', 'error');
      return;
    }
    if (trimmed === session?.user?.email) {
      onToast?.('That is already your email address.', 'error');
      return;
    }
    setChangingEmail(true);

    const { error } = await supabase.auth.updateUser({ email: trimmed });

    if (error) {
      onToast?.(error.message, 'error');
    } else {
      onToast?.('Confirmation link sent. Check both inboxes to complete the change.');
      setShowEmailForm(false);
      setNewEmail('');
    }
    setChangingEmail(false);
  }

  async function signOutOtherSessions() {
    setSigningOutOthers(true);
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) {
      onToast?.(error.message, 'error');
    } else {
      onToast?.('Signed out of all other devices.');
      await loadSessions();
    }
    setSigningOutOthers(false);
  }

  async function deleteAccount() {
    setDeletingAccount(true);

    const { data, error } = await supabase.rpc('request_account_deletion');

    if (error || !data?.success) {
      onToast?.(error?.message || 'Could not delete your account.', 'error');
      setDeletingAccount(false);
      return;
    }

    onToast?.('Your account has been scheduled for deletion. Signing you out…');
    setTimeout(async () => {
      await supabase.auth.signOut();
      onSignOut?.();
    }, 1800);

    setDeletingAccount(false);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function deviceLabel(userAgent) {
    if (!userAgent) return 'Unknown device';
    const ua = userAgent.toLowerCase();
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';
    if (ua.includes('android')) return 'Android device';
    if (ua.includes('mac')) return 'Mac';
    if (ua.includes('windows')) return 'Windows PC';
    if (ua.includes('linux')) return 'Linux';
    return 'Unknown device';
  }

  function deviceIcon(userAgent) {
    const ua = (userAgent || '').toLowerCase();
    if (ua.includes('iphone') || ua.includes('android') || ua.includes('ipad')) return Smartphone;
    return Monitor;
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
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
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          aria-label="Back"
          style={iconBtn}
        >
          <ArrowLeft size={19} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} color="#2563EB" /> Privacy & Security
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8' }}>
            Manage your account security
          </p>
        </div>
      </div>

      {/* Change password */}
      <Section
        icon={Lock}
        title="Change password"
        description="Update the password you use to sign in."
        action={
          !showPasswordForm && (
            <SectionButton onClick={() => setShowPasswordForm(true)}>
              Change
            </SectionButton>
          )
        }
      >
        <AnimatePresence>
          {showPasswordForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring}
              onSubmit={changePassword}
              style={{ overflow: 'hidden' }}
            >
              <PasswordField
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                show={showNewPwd}
                onToggleShow={() => setShowNewPwd(v => !v)}
                placeholder="At least 8 characters"
              />
              <PasswordField
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Same as above"
              />
              <FormActions
                onCancel={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword(''); }}
                submitLabel="Update password"
                submitting={changingPwd}
                disabled={newPassword.length < 8 || newPassword !== confirmPassword}
              />
            </motion.form>
          )}
        </AnimatePresence>
      </Section>

      {/* Change email */}
      <Section
        icon={Mail}
        title="Change email"
        description={`Current email: ${session?.user?.email || '—'}`}
        action={
          !showEmailForm && (
            <SectionButton onClick={() => setShowEmailForm(true)}>
              Change
            </SectionButton>
          )
        }
      >
        <AnimatePresence>
          {showEmailForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring}
              onSubmit={changeEmail}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>New email address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="you@newemail.com"
                  required
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                  Supabase will send a confirmation link to both your old and new inboxes.
                </div>
              </div>
              <FormActions
                onCancel={() => { setShowEmailForm(false); setNewEmail(''); }}
                submitLabel="Send confirmation"
                submitting={changingEmail}
                disabled={!newEmail.includes('@')}
              />
            </motion.form>
          )}
        </AnimatePresence>
      </Section>

      {/* Active sessions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.15 }}
        style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid #E5EAF2',
          boxShadow: '0 6px 20px rgba(16,28,58,.04)',
          padding: 18,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={iconBubble}>
            <Smartphone size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Active sessions</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              Devices currently signed in
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={signOutOtherSessions}
            disabled={signingOutOthers}
            style={{
              padding: '8px 12px',
              border: '1px solid #FCE8E8',
              borderRadius: 10,
              background: '#fff',
              color: '#B42318',
              fontSize: 12,
              fontWeight: 700,
              cursor: signingOutOthers ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {signingOutOthers ? (
              <LoaderCircle size={12} className="cf-spin" />
            ) : (
              <LogOut size={12} />
            )}
            Sign out others
          </motion.button>
        </div>

        {loadingSessions ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <LoaderCircle size={20} className="cf-spin" color="#94A3B8" style={{ margin: '0 auto' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
            No sessions found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.slice(0, 5).map((s, i) => {
              const DeviceIcon = deviceIcon(s.user_agent);
              const isRecent = i === 0;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: 0.05 * i }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 11,
                    background: isRecent ? '#F5F8FF' : '#FAFBFC',
                    border: '1px solid #E5EAF2',
                  }}
                >
                  <DeviceIcon size={15} color="#2563EB" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      {deviceLabel(s.user_agent)}
                      {isRecent && (
                        <span style={{
                          marginLeft: 6,
                          padding: '2px 6px',
                          background: '#DCFCE7',
                          color: '#15803D',
                          fontSize: 9,
                          fontWeight: 800,
                          borderRadius: 5,
                          letterSpacing: 0.3,
                        }}>
                          THIS DEVICE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                      Last active {formatDate(s.updated_at)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Delete account */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        style={{
          background: '#FEF2F2',
          borderRadius: 20,
          border: '1px solid #FCE8E8',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            background: 'rgba(180,35,24,.1)',
            color: '#B42318',
            borderRadius: 12,
            display: 'grid', placeItems: 'center',
            flexShrink: 0,
          }}>
            <Trash2 size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#B42318' }}>
              Delete account
            </div>
            <div style={{ fontSize: 12, color: '#B42318', opacity: 0.7, marginTop: 2 }}>
              Permanently delete your profile, listings, and data.
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '8px 12px',
              border: '1px solid #F5C2C2',
              borderRadius: 10,
              background: 'white',
              color: '#B42318',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Delete
          </motion.button>
        </div>
      </motion.div>

      {/* Delete confirmation modal — unchanged */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !deletingAccount && setShowDeleteConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: 'rgba(7,16,42,.7)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
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
                maxWidth: 400,
                padding: 26,
                background: '#fff',
                borderRadius: 24,
                textAlign: 'center',
              }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={spring}
                style={{
                  width: 56, height: 56,
                  margin: '0 auto 16px',
                  background: 'rgba(180,35,24,.1)',
                  color: '#B42318',
                  borderRadius: '50%',
                  display: 'grid', placeItems: 'center',
                }}
              >
                <AlertTriangle size={28} />
              </motion.div>
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>
                Delete your account?
              </h2>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#4B5563', lineHeight: 1.6 }}>
                Your listings will be removed and your profile will be scheduled for permanent deletion.
              </p>
              <p style={{ margin: '0 0 24px', fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
                You will be signed out immediately. This cannot be undone after 30 days.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={deleteAccount}
                  disabled={deletingAccount}
                  style={{
                    width: '100%',
                    padding: 14,
                    border: 0,
                    borderRadius: 14,
                    background: '#B42318',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: deletingAccount ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {deletingAccount ? (
                    <>
                      <LoaderCircle size={15} className="cf-spin" /> Deleting…
                    </>
                  ) : (
                    'Yes, delete my account'
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingAccount}
                  style={{
                    width: '100%',
                    padding: 13,
                    border: '1px solid #E5EAF2',
                    borderRadius: 14,
                    background: '#fff',
                    color: '#4B5563',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

function Section({ icon: Icon, title, description, action, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      style={{
        background: '#fff',
        borderRadius: 20,
        border: '1px solid #E5EAF2',
        boxShadow: '0 6px 20px rgba(16,28,58,.04)',
        padding: 18,
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={iconBubble}>
          <Icon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2, lineHeight: 1.5 }}>
            {description}
          </div>
        </div>
        {action}
      </div>
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </motion.div>
  );
}

function SectionButton({ onClick, children }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        padding: '8px 14px',
        border: '1px solid #E5EAF2',
        borderRadius: 10,
        background: 'white',
        color: '#2563EB',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {children}
    </motion.button>
  );
}

function PasswordField({ label, value, onChange, show, onToggleShow, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          minLength={8}
          required
          style={{ ...inputStyle, paddingRight: onToggleShow ? 44 : 14 }}
        />
        {onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            aria-label={show ? 'Hide' : 'Show'}
            style={{
              position: 'absolute',
              right: 10, top: '50%',
              transform: 'translateY(-50%)',
              width: 28, height: 28,
              border: 0,
              background: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function FormActions({ onCancel, submitLabel, submitting, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        style={{
          flex: 1,
          padding: 12,
          border: '1px solid #E5EAF2',
          borderRadius: 12,
          background: '#fff',
          color: '#4B5563',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting || disabled}
        style={{
          flex: 1.5,
          padding: 12,
          border: 0,
          borderRadius: 12,
          background: '#2563EB',
          color: '#fff',
          fontSize: 13,
          fontWeight: 800,
          cursor: submitting || disabled ? 'not-allowed' : 'pointer',
          opacity: submitting || disabled ? 0.55 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {submitting ? (
          <>
            <LoaderCircle size={14} className="cf-spin" /> Saving…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}

const iconBtn = {
  width: 38, height: 38,
  border: '1px solid #E5EAF2', borderRadius: 12,
  background: 'white', color: '#101C3A',
  display: 'grid', placeItems: 'center', cursor: 'pointer',
};

const iconBubble = {
  width: 40, height: 40,
  background: 'rgba(37,99,235,.08)',
  color: '#2563EB',
  borderRadius: 12,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#4B5563',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  border: '1px solid #E5EAF2',
  borderRadius: 12,
  background: '#fff',
  fontSize: 14,
  color: '#101C3A',
  outline: 'none',
};