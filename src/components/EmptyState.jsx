import React from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Heart, Store, Sparkles, Bell, Package, ArrowRight,
  ShoppingBag, Users
} from 'lucide-react';

const spring = { type: 'spring', stiffness: 300, damping: 25 };

const PRESETS = {
  saved: {
    icon: Heart,
    accent: '#E11D48',
    accentSoft: 'rgba(225, 29, 72, 0.08)',
    title: "Nothing saved yet",
    message: "Tap the heart on any listing to save it here for later.",
    actionLabel: "Browse marketplace",
  },
  shop: {
    icon: Store,
    accent: '#2563EB',
    accentSoft: 'rgba(37, 99, 235, 0.08)',
    title: "Your shop is empty",
    message: "Post your first item and start earning from campus. It takes about 2 minutes.",
    actionLabel: "Post an item",
  },
  search: {
    icon: Search,
    accent: '#2563EB',
    accentSoft: 'rgba(37, 99, 235, 0.08)',
    title: "No matches",
    message: "Try a shorter word or check your spelling.",
    actionLabel: "Clear search",
  },
  wanted: {
    icon: Bell,
    accent: '#F5A623',
    accentSoft: 'rgba(245, 166, 35, 0.10)',
    title: "No matches yet",
    message: "We'll notify you the moment something matches your Wanted ads.",
    actionLabel: "Post a Wanted ad",
  },
  listings: {
    icon: Package,
    accent: '#2563EB',
    accentSoft: 'rgba(37, 99, 235, 0.08)',
    title: "No listings here",
    message: "Nothing matches this filter yet. Try a different one.",
    actionLabel: "Clear filters",
  },
  notifications: {
    icon: Bell,
    accent: '#15803D',
    accentSoft: 'rgba(21, 128, 61, 0.08)',
    title: "You're all caught up",
    message: "New notifications will appear here as they arrive.",
  },
  generic: {
    icon: Sparkles,
    accent: '#2563EB',
    accentSoft: 'rgba(37, 99, 235, 0.08)',
    title: "Nothing here yet",
    message: "Check back soon.",
  },
};

export default function EmptyState({
  variant,
  icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  suggestions,
  size = 'md',
}) {
  const preset = variant ? PRESETS[variant] || PRESETS.generic : PRESETS.generic;
  const Icon = icon || preset.icon || Search;
  const resolvedTitle = title || preset.title;
  const resolvedMessage = message || preset.message;
  const resolvedActionLabel = actionLabel || preset.actionLabel;
  const accent = preset.accent;
  const accentSoft = preset.accentSoft;

  const isSm = size === 'sm';
  const padding = isSm ? '28px 20px' : '44px 24px';
  const iconBox = isSm ? 52 : 68;
  const iconSize = isSm ? 24 : 30;
  const titleSize = isSm ? 16 : 18;
  const messageSize = isSm ? 12 : 13;
  const minHeight = isSm ? 200 : 300;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        textAlign: 'center',
        background: 'linear-gradient(180deg, #ffffff 0%, #F5F8FF 100%)',
        borderRadius: 24,
        border: '1px solid #E5EAF2',
        minHeight,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Soft ambient glow behind the icon */}
      <div
        style={{
          position: 'absolute',
          top: '18%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 200,
          height: 200,
          background: `radial-gradient(circle, ${accentSoft} 0%, transparent 65%)`,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ scale: 0.7, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...spring, delay: 0.08 }}
        style={{
          width: iconBox,
          height: iconBox,
          borderRadius: 20,
          background: accentSoft,
          color: accent,
          display: 'grid',
          placeItems: 'center',
          marginBottom: 18,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Icon size={iconSize} strokeWidth={2.2} />
      </motion.div>

      <h3
        style={{
          margin: '0 0 8px',
          fontSize: titleSize,
          fontWeight: 800,
          color: '#101C3A',
          letterSpacing: -0.3,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {resolvedTitle}
      </h3>

      <p
        style={{
          margin: resolvedActionLabel || suggestions?.length ? '0 0 20px' : 0,
          fontSize: messageSize,
          color: '#94A3B8',
          maxWidth: 320,
          lineHeight: 1.55,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {resolvedMessage}
      </p>

      {suggestions?.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 20,
            maxWidth: 340,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {suggestions.map((s) => (
            <span
              key={s}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                background: '#F1F5F9',
                color: '#4B5563',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Try "{s}"
            </span>
          ))}
        </div>
      )}

      {(resolvedActionLabel && onAction) || (secondaryLabel && onSecondary) ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {resolvedActionLabel && onAction && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAction}
              style={{
                padding: isSm ? '10px 20px' : '12px 24px',
                borderRadius: 14,
                background: accent,
                color: 'white',
                fontWeight: 800,
                fontSize: isSm ? 13 : 14,
                border: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: `0 6px 18px ${accent}30`,
              }}
            >
              {resolvedActionLabel}
              <ArrowRight size={isSm ? 14 : 16} />
            </motion.button>
          )}

          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                background: 'transparent',
                color: '#4B5563',
                fontWeight: 700,
                fontSize: 12,
                border: 0,
                cursor: 'pointer',
              }}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      ) : null}
    </motion.div>
  );
}