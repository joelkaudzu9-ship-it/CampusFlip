import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Plus, ArrowRight, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const springPhysics = { type: "spring", stiffness: 300, damping: 28, mass: 0.8 };

export default function SaleCelebration({ sale, onClose, onPostAnother }) {
  // Prevent background scrolling while celebration is active
  useEffect(() => {
    if (!sale) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [sale]);

  async function shareInvite() {
    // Fetch the user's referral code
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .maybeSingle();

    const code = profile?.referral_code;
    if (!code) return;

    const url = `${window.location.origin}/invite/${code}`;
    const text = `I just sold "${sale?.title}" on CampusFlip. Join me — you get MK 200 off your first listing:`;

    if (navigator.share) {
      await navigator.share({ title: 'Join CampusFlip', text, url });
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    }
  }

  return (
    <AnimatePresence>
      {sale && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 40%, #0d5c3d 0%, #082a1c 100%)',
            padding: 24,
            textAlign: 'center'
          }}
        >
          {/* Confetti Burst */}
          <ConfettiBurst />

          {/* Checkmark */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...springPhysics, delay: 0.1 }}
            style={{
              width: 110, height: 110, borderRadius: '50%',
              background: 'rgba(122, 240, 182, 0.15)',
              border: '3px solid #7af0b6',
              display: 'grid', placeItems: 'center',
              marginBottom: 32,
              boxShadow: '0 0 60px rgba(122, 240, 182, 0.4)'
            }}
          >
            <CheckCircle2 size={56} color="#7af0b6" strokeWidth={2.5} />
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPhysics, delay: 0.3 }}
          >
            <span style={{
              fontSize: 12, fontWeight: 800, letterSpacing: 2,
              color: '#7af0b6', textTransform: 'uppercase'
            }}>
              You sold it!
            </span>
            <h1 style={{
              margin: '12px 0 16px',
              fontSize: 32, fontWeight: 850, color: 'white',
              letterSpacing: -1, lineHeight: 1.15
            }}>
              {sale.title}
            </h1>
            {sale.price && (
              <div style={{
                display: 'inline-block',
                padding: '10px 20px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: 20, fontWeight: 800,
                marginBottom: 12
              }}>
                MK {Number(sale.price).toLocaleString('en-US')}
              </div>
            )}
            <p style={{
              margin: '8px 0 40px',
              fontSize: 14, color: 'rgba(255,255,255,0.65)',
              maxWidth: 280, marginInline: 'auto', lineHeight: 1.5
            }}>
              Nice work! Keep the momentum going.
            </p>
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPhysics, delay: 0.5 }}
            style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onPostAnother}
              style={{
                width: '100%', padding: '16px 20px',
                border: 0, borderRadius: 16,
                background: '#7af0b6', color: '#082a1c',
                fontSize: 15, fontWeight: 800,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <Plus size={18} strokeWidth={3} /> Post another item
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={shareInvite}
              style={{
                width: '100%',
                padding: '15px 20px',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.12)',
                color: 'white',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backdropFilter: 'blur(10px)'
              }}
            >
              <Share2 size={17} />
              Invite a friend — earn MK 200
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              style={{
                width: '100%', padding: '14px 20px',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              Back to my shop <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Confetti animation
function ConfettiBurst() {
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    angle: (i / 20) * Math.PI * 2,
    distance: 120 + Math.random() * 80,
    delay: Math.random() * 0.2,
    size: 6 + Math.random() * 8,
    color: ['#7af0b6', '#FFB900', '#64B5F6', '#ffffff'][Math.floor(Math.random() * 4)]
  }));

  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0.3
          }}
          transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: 2,
            background: p.color
          }}
        />
      ))}
    </div>
  );
}