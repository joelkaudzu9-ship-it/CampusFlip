import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShoppingBag, Zap, ShieldCheck, MapPin, ArrowRight, Smartphone
} from 'lucide-react';

const spring = { type: 'spring', stiffness: 300, damping: 30 };
const softSpring = { type: 'spring', stiffness: 200, damping: 25 };

const SLIDES = [
  {
    id: 'buy',
    eyebrow: 'BUY ANYTHING',
    title: 'Buy anything\non campus.',
    body: 'Textbooks, laptops, lab coats, calculators, electronics. All from students you can trust.',
    icon: ShoppingBag,
    accent: '#2563EB',
    bg: 'linear-gradient(145deg, #EFF5FF 0%, #DCE7FF 100%)'
  },
  {
    id: 'sell',
    eyebrow: 'SELL IN SECONDS',
    title: 'Sell in\nseconds.',
    body: 'Snap a photo, set a price, and reach every student on campus in minutes. No shop needed.',
    icon: Zap,
    accent: '#D97706',
    bg: 'linear-gradient(145deg, #FFF8E6 0%, #FFE9B8 100%)'
  },
  {
    id: 'safe',
    eyebrow: 'MEET SAFELY',
    title: 'Meet safely.\nPay securely.',
    body: '12 official KUHeS meeting spots. Verified sellers. Mobile money payments you can trust.',
    icon: ShieldCheck,
    accent: '#15803D',
    bg: 'linear-gradient(145deg, #EFFAF6 0%, #D6F5E7 100%)'
  }
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

  function skip() {
    onComplete();
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
        overflow: 'hidden'
      }}
    >
      {/* Skip button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px 20px 0' }}>
        <button
          type="button"
          onClick={skip}
          style={{
            padding: '8px 14px',
            border: '1px solid rgba(16,28,58,.12)',
            borderRadius: 20,
            background: 'rgba(255,255,255,.7)',
            color: '#101C3A',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
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
            padding: '0 32px',
            textAlign: 'center'
          }}
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring, delay: 0.1 }}
            style={{
              width: 120,
              height: 120,
              borderRadius: 34,
              background: slide.accent,
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 32,
              boxShadow: `0 20px 50px ${slide.accent}55`
            }}
          >
            <Icon size={54} strokeWidth={2.2} />
          </motion.div>

          <span style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 2,
            color: slide.accent,
            marginBottom: 14
          }}>
            {slide.eyebrow}
          </span>

          <h1 style={{
            margin: 0,
            fontSize: 34,
            fontWeight: 850,
            letterSpacing: -1.2,
            lineHeight: 1.1,
            color: '#101C3A',
            whiteSpace: 'pre-line'
          }}>
            {slide.title}
          </h1>

          <p style={{
            margin: '18px 0 0',
            fontSize: 15,
            lineHeight: 1.6,
            color: '#4B5563',
            maxWidth: 300
          }}>
            {slide.body}
          </p>

          {/* Extra visuals per slide */}
          {slide.id === 'buy' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.3 }}
              style={{ display: 'flex', gap: 10, marginTop: 32 }}
            >
              {[
                { e: '📚', label: 'Books' },
                { e: '💻', label: 'Laptops' },
                { e: '👕', label: 'Clothes' },
                { e: '🍲', label: 'Food' }
              ].map(tag => (
                <div
                  key={tag.label}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,.75)',
                    border: '1px solid rgba(255,255,255,.95)',
                    borderRadius: 14,
                    boxShadow: '0 4px 12px rgba(16,28,58,.06)'
                  }}
                >
                  <div style={{ fontSize: 20 }}>{tag.e}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', marginTop: 2 }}>
                    {tag.label}
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
              style={{ marginTop: 32, width: '100%', maxWidth: 280 }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 16px',
                background: 'rgba(255,255,255,.85)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,.95)',
                boxShadow: '0 8px 20px rgba(16,28,58,.08)',
                textAlign: 'left'
              }}>
                <div style={{
                  width: 40, height: 40,
                  borderRadius: 12,
                  background: '#F5A623',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#101C3A',
                  fontSize: 18,
                  fontWeight: 800
                }}>
                  +
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#101C3A' }}>Post an item</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>Free for Wanted · MK 200 for Sale</div>
                </div>
              </div>
            </motion.div>
          )}

          {slide.id === 'safe' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.3 }}
              style={{ marginTop: 32, display: 'flex', gap: 10 }}
            >
              {[
                { icon: MapPin, label: 'Safe spots' },
                { icon: ShieldCheck, label: 'Verified' },
                { icon: Smartphone, label: 'Mobile money' }
              ].map(tag => (
                <div
                  key={tag.label}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,.75)',
                    border: '1px solid rgba(255,255,255,.95)',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    minWidth: 82
                  }}
                >
                  <tag.icon size={18} color={slide.accent} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#4B5563' }}>
                    {tag.label}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer: dots + CTA */}
      <div style={{ padding: '24px 32px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === index ? 24 : 8,
                height: 8,
                borderRadius: 4,
                border: 0,
                background: i === index ? slide.accent : 'rgba(16,28,58,.15)',
                cursor: 'pointer',
                padding: 0,
                transition: 'width 0.25s ease, background 0.25s ease'
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
            boxShadow: `0 12px 30px ${slide.accent}44`
          }}
        >
          {isLast ? 'Enter CampusFlip' : 'Continue'}
          <ArrowRight size={18} />
        </motion.button>
      </div>
    </div>
  );
}