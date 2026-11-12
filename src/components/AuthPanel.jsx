import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, LoaderCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const spring = { type: 'spring', stiffness: 320, damping: 30 };
const slide = { type: 'spring', stiffness: 280, damping: 30 };

const variants = {
  login: {
    initial: { x: -30, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 30, opacity: 0 }
  },
  signup: {
    initial: { x: 30, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -30, opacity: 0 }
  },
  reset: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 }
  }
};

export default function AuthPanel({ onAuthenticated, onToast }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function switchMode(next) {
    if (loading) return;
    setMode(next);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.');
      }

      if (mode === 'signup') {
        if (name.trim().length < 2) throw new Error('Please enter your full name.');

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } }
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          onAuthenticated?.(data.session);
        } else {
          onToast?.('Account created. Check your email to verify before signing in.', 'success');
          setMode('login');
        }
      }

      if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (signInError) throw signInError;
        onAuthenticated?.(data.session);
      }

      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/` }
        );
        if (resetError) throw resetError;
        onToast?.('If an account exists for that email, a reset link is on its way.', 'success');
        setMode('login');
      }
    } catch (err) {
      onToast?.(err.message || 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const heading =
    mode === 'signup' ? 'Create your account' :
    mode === 'login'  ? 'Welcome back' :
    'Reset your password';

  const subheading =
    mode === 'signup' ? 'Join CampusFlip in 30 seconds.' :
    mode === 'login'  ? 'Sign in to save items and contact sellers.' :
    'We will send you a secure reset link.';

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: -0.5, color: '#101C3A' }}>
          {heading}
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>
          {subheading}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'signup' && (
            <motion.div
              key="name"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <AuthField
                icon={User}
                label="Full name"
                id="auth-name"
                name="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Joel Kaudzu"
                autoComplete="name"
                required
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AuthField
          icon={Mail}
          label="Email address"
          id="auth-email"
          name="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@kuhes.ac.mw"
          autoComplete="email"
          required
        />

        <AnimatePresence mode="wait" initial={false}>
          {mode !== 'reset' && (
            <motion.div
              key="password"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div>
                <label
                  htmlFor="auth-password"
                  style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 7 }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }}>
                    <Lock size={16} />
                  </div>
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={8}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '13px 44px 13px 42px',
                      border: '1px solid #E5EAF2',
                      borderRadius: 13,
                      background: '#fff',
                      fontSize: 14,
                      color: '#101C3A',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: 10, top: '50%',
                      transform: 'translateY(-50%)',
                      width: 32, height: 32,
                      border: 0, borderRadius: 8,
                      background: 'transparent',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      display: 'grid', placeItems: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mode === 'login' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ alignSelf: 'flex-end', marginTop: -6 }}
            >
              <button
                type="button"
                onClick={() => switchMode('reset')}
                style={{
                  border: 0, background: 'transparent',
                  color: '#2563EB', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', padding: 0
                }}
              >
                Forgot password?
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={loading}
          style={{
            marginTop: 6,
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
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          {loading ? (
            <>
              <LoaderCircle size={16} className="cf-spin" />
              Please wait…
            </>
          ) : (
            <>
              {mode === 'signup' ? 'Create account' : mode === 'login' ? 'Sign in' : 'Send reset link'}
              <ArrowRight size={16} />
            </>
          )}
        </motion.button>
      </form>

      {/* Mode switcher — animated */}
      <div style={{
        marginTop: 22,
        paddingTop: 18,
        borderTop: '1px solid #E5EAF2',
        textAlign: 'center',
        minHeight: 20
      }}>
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'login' && (
            <motion.div
              key="switch-signup"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: 13, color: '#94A3B8' }}
            >
              New to CampusFlip?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                style={{ border: 0, background: 'transparent', color: '#2563EB', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Create an account
              </button>
            </motion.div>
          )}
          {mode === 'signup' && (
            <motion.div
              key="switch-login"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: 13, color: '#94A3B8' }}
            >
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{ border: 0, background: 'transparent', color: '#2563EB', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Sign in
              </button>
            </motion.div>
          )}
          {mode === 'reset' && (
            <motion.div
              key="switch-back"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{ border: 0, background: 'transparent', color: '#2563EB', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13 }}
              >
                ← Back to sign in
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Small field component */
function AuthField({ icon: Icon, label, id, name, type, value, onChange, placeholder, autoComplete, required }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 7 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }}>
          <Icon size={16} />
        </div>
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '13px 13px 13px 42px',
            border: '1px solid #E5EAF2',
            borderRadius: 13,
            background: '#fff',
            fontSize: 14,
            color: '#101C3A',
            outline: 'none'
          }}
        />
      </div>
    </div>
  );
}