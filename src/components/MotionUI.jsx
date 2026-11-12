import React, { useEffect } from 'react';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from 'framer-motion';

/* Shared spring physics */
export const spring = { type: 'spring', stiffness: 300, damping: 30 };
export const softSpring = { type: 'spring', stiffness: 200, damping: 25 };

/* Body scroll lock */
function useBodyLock(active) {
  useEffect(() => {
    if (!active) return;
    const y = window.scrollY;
    const prev = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      overflow: document.body.style.overflow,
      width: document.body.style.width,
    };
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.left = prev.left;
      document.body.style.right = prev.right;
      document.body.style.overflow = prev.overflow;
      document.body.style.width = prev.width;
      window.scrollTo(0, y);
    };
  }, [active]);
}

/* Animated modal */
export function AnimatedModal({
  open,
  onClose,
  children,
  className = '',
  closeOnBackdrop = true,
}) {
  const reduceMotion = useReducedMotion();
  useBodyLock(open);

  useEffect(() => {
    if (!open) return;
    const handleKey = e => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cf-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
          onClick={e => {
            if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            className={`cf-modal ${className}`}
            role="dialog"
            aria-modal="true"
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.95 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }
            }
            transition={spring}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Animated tab switcher */
export function AnimatedTabs({ tabs, value, onChange, className = '' }) {
  const reduceMotion = useReducedMotion();

  return (
    <LayoutGroup>
      <div className={className}>
        {tabs.map(tab => {
          const selected = value === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              className={`cf-motion-tab ${selected ? 'active' : ''}`}
              aria-pressed={selected}
              onClick={() => onChange(tab.value)}
            >
              {selected && !reduceMotion && (
                <motion.span
                  className="cf-tab-indicator"
                  layoutId="cf-active-tab"
                  transition={spring}
                />
              )}
              <span className="cf-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

/* Animated buttons */
export function MotionButton({ children, className = '', disabled, ...rest }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      className={className}
      disabled={disabled}
      whileHover={!disabled && !reduceMotion ? { y: -2 } : undefined}
      whileTap={!disabled && !reduceMotion ? { scale: 0.96 } : undefined}
      transition={spring}
      {...rest}
    >
      {children}
    </motion.button>
  );
}