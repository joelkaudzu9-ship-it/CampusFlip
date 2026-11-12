import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShoppingBag, Zap, ShieldCheck, MapPin, ArrowRight, Smartphone,
  BookOpen, CreditCard, Users, Check
} from 'lucide-react';

const spring = { type: 'spring', stiffness: 300, damping: 30 };
const softSpring = { type: 'spring', stiffness: 200, damping: 25 };

const SLIDES = [
  {
    id: 'buy',
    eyebrow: 'FOR KUHeS STUDENTS',
    title: 'The textbooks\nyou need.\nAt campus prices.',
    body: 'Anatomy atlases, lab coats, calculators, laptops. Everything you need for the semester — from students a few years ahead who already finished with theirs.',
    icon: ShoppingBag,
    accent: '#2563EB',
    bg: 'linear-gradient(160deg, #EFF5FF 0%, #DCE7FF 100%)',
  },
  {
    id: 'sell',
    eyebrow: 'SELL IN MINUTES',
    title: "What you\noutgrew.\nSomeone's next.",
    body: "That Gray's Anatomy you never opened. The lab coat that's one size too small. The calculator you bought and never used. Post it in 2 minutes and reach every student on campus.",
    icon: Zap,
    accent: '#D97706',
    bg: 'linear-gradient(160deg, #FFF8E6 0%, #FFE9B8 100%)',
  },
  {
    id: 'safe',
    eyebrow: 'SAFE FROM START TO FINISH',
    title: 'Meet safely.\nPay securely.',
    body: 'Only students with a KUHeS email can join. Meeting spots are official campus locations. Payments go through mobile money you already trust.',
    icon: ShieldCheck,
    accent: '#15803D',
    bg: 'linear-gradient(160deg, #EFFAF6 0%, #D6F5E7 100%)',
  },
];

export default function Onboarding({ onComplete }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const Icon = slide.icon;
  const isLast = index === SLIDES.length - 1;

  function next() {
    if (isLast) onComplete();
    else setIndex(i => i + 1);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        background: slide.bg,
        transition: 'background 0.6s ease',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 20px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#101C3A',
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: -0.5,
            }}
          >
            CF
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#101C3A',
              letterSpacing: -0.2,
            }}
          >
            Campus<span style={{ color: slide.accent }}>Flip</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onComplete}
          style={{
            padding: '8px 14px',
            border: '1px solid rgba(16,28,58,.10)',
            borderRadius: 20,
            background: 'rgba(255,255,255,.6)',
            color: '#4B5563',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={softSpring}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 28px',
            textAlign: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring, delay: 0.1 }}
            style={{
              width: 108,
              height: 108,
              borderRadius: 30,
              background: slide.accent,
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 28,
              boxShadow: `0 20px 50px ${slide.accent}55`,
              position: 'relative',
            }}
          >
            <Icon size={48} strokeWidth={2.2} />
          </motion.div>

          <span
            style={{
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 2,
              color: slide.accent,
              marginBottom: 14,
            }}
          >
            {slide.eyebrow}
          </span>

          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 850,
              letterSpacing: -1.2,
              lineHeight: 1.08,
              color: '#101C3A',
              whiteSpace: 'pre-line',
            }}
          >
            {slide.title}
          </h1>

          <p
            style={{
              margin: '20px 0 0',
              fontSize: 14,
              lineHeight: 1.65,
              color: '#4B5563',
              maxWidth: 320,
            }}
          >
            {slide.body}
          </p>

          {/* Slide-specific visual enrichments */}
          {slide.id === 'buy' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.3 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                marginTop: 30,
                maxWidth: 340,
                width: '100%',
              }}
            >
              {[
                { e: '📚', label: 'Books', count: '120+' },
                { e: '💻', label: 'Tech', count: '80+' },
                { e: '👕', label: 'Gear', count: '60+' },
                { e: '🔬', label: 'Lab', count: '40+' },
              ].map((tag) => (
                <div
                  key={tag.label}
                  style={{
                    padding: '12px 8px',
                    background: 'rgba(255,255,255,.75)',
                    border: '1px solid rgba(255,255,255,.95)',
                    borderRadius: 14,
                    boxShadow: '0 4px 12px rgba(16,28,58,.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{tag.e}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#101C3A' }}>
                    {tag.label}
                  </div>
                  <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 1 }}>
                    {tag.count}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {slide.id === 'sell' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.3 }}
              style={{ marginTop: 28, width: '100%', maxWidth: 300 }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,.85)',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,.95)',
                  boxShadow: '0 8px 20px rgba(16,28,58,.08)',
                  textAlign: 'left',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#F5A623',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#101C3A',
                    fontSize: 16,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  +
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#101C3A' }}>
                    Post an item
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
                    2 minutes · Wanted is free
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,.7)',
                  borderRadius: 12,
                  fontSize: 11,
                  color: '#4B5563',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'left',
                }}
              >
                <CreditCard size={13} color="#D97706" />
                <span>MK 200 per sale listing · Free with referral credits</span>
              </div>
            </motion.div>
          )}

          {slide.id === 'safe' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.3 }}
              style={{
                marginTop: 28,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
                maxWidth: 300,
                width: '100%',
              }}
            >
              {[
                { icon: Users, label: 'KUHeS only' },
                { icon: MapPin, label: 'Safe spots' },
                { icon: ShieldCheck, label: 'Verified sellers' },
                { icon: Smartphone, label: 'Mobile money' },
              ].map((tag) => (
                <div
                  key={tag.label}
                  style={{
                    padding: '10px 8px',
                    background: 'rgba(255,255,255,.7)',
                    border: '1px solid rgba(255,255,255,.95)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    justifyContent: 'center',
                  }}
                >
                  <tag.icon size={15} color={slide.accent} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#101C3A' }}>
                    {tag.label}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div
        style={{
          padding: '24px 28px calc(env(safe-area-inset-bottom, 0px) + 32px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Progress segments */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                border: 0,
                background: i <= index ? slide.accent : 'rgba(16,28,58,.12)',
                cursor: 'pointer',
                padding: 0,
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={next}
          style={{
            width: '100%',
            border: 0,
            borderRadius: 18,
            padding: 17,
            background: slide.accent,
            color: 'white',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: `0 12px 30px ${slide.accent}44`,
          }}
        >
          {isLast ? (
            <>
              <Check size={18} />
              Enter CampusFlip
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={18} />
            </>
          )}
        </motion.button>

        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: '#94A3B8',
            fontWeight: 600,
          }}
        >
          {isLast
            ? 'You can change all settings later.'
            : `Step ${index + 1} of ${SLIDES.length}`}
        </div>
      </div>
    </div>
  );
}