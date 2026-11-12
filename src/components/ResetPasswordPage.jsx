import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, ArrowRight, LoaderCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const spring = { type: 'spring', stiffness: 300, damping: 28 };

export default function ResetPasswordPage({ onComplete, onToast }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    onToast?.('', 'silent'); // clear any stale toast

    if (password.length < 8) {
      onToast?.('Password must be at least 8 characters.', 'error');
      return;
    }

    if (password !== confirm) {
      onToast?.('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setSuccess(true);

      // Sign out so the temporary recovery session ends.
      // User can sign back in with the new password.
      setTimeout(async () => {
        await supabase.auth.signOut();
        onComplete?.();
      }, 1800);
    } catch (err) {
      console.error('Password update failed:', err);
      onToast?.(err.message || 'Could not update your password.', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          background: '#F5F8FF',
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={spring}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(34,197,94,.1)',
            color: '#15803D',
            display: 'grid',
            placeItems: 'center',
            marginBottom: 20,
          }}
        >
          <CheckCircle2 size={36} />
        </motion.div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#101C3A' }}>
          Password updated
        </h1>
        <p style={{ marginTop: 10, color: '#4B5563', fontSize: 14, maxWidth: 320 }}>
          You can now sign in with your new password.
        </p>
        <p style={{ marginTop: 16, color: '#94A3B8', fontSize: 12 }}>
          Redirecting to sign in…
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'radial-gradient(ellipse at 50% 25%, #F5F8FF 0%, #E5EDFB 100%)',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring}
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: '#101C3A',
          color: 'white',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 24,
          boxShadow: '0 12px 30px rgba(16,28,58,.25)',
        }}
      >
        <Lock size={28} />
      </motion.div>

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#101C3A', letterSpacing: -0.5 }}>
            Set a new password
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>
            Choose a strong password you don't use anywhere else.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="reset-password" style={labelStyle}>New password</label>
            <div style={{ position: 'relative' }}>
              <div style={iconStyle}>
                <Lock size={16} />
              </div>
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={showButtonStyle}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reset-confirm" style={labelStyle}>Confirm new password</label>
            <div style={{ position: 'relative' }}>
              <div style={iconStyle}>
                <Lock size={16} />
              </div>
              <input
                id="reset-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Type it again"
                autoComplete="new-password"
                minLength={8}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || password.length < 8 || password !== confirm}
            style={{
              marginTop: 8,
              width: '100%',
              border: 0,
              borderRadius: 14,
              padding: '15px 18px',
              background: '#2563EB',
              color: 'white',
              fontSize: 14,
              fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 10px 24px rgba(37,99,235,.22)',
              opacity: loading || password.length < 8 || password !== confirm ? 0.55 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <LoaderCircle size={16} className="cf-spin" />
                Updating…
              </>
            ) : (
              <>
                Update password
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#4B5563',
  marginBottom: 7,
};

const iconStyle = {
  position: 'absolute',
  left: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#94A3B8',
  pointerEvents: 'none',
};

const showButtonStyle = {
  position: 'absolute',
  right: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 32,
  height: 32,
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: '#94A3B8',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '13px 44px 13px 42px',
  border: '1px solid #E5EAF2',
  borderRadius: 13,
  background: '#fff',
  fontSize: 14,
  color: '#101C3A',
  outline: 'none',
};