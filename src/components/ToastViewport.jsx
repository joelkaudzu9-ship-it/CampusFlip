import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function ToastViewport({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div className="cf-toast-viewport" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={`cf-toast ${toast.type || 'success'}`}
            initial={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, scale: 0.95, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <span className="cf-toast-indicator">
              {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            </span>
            <span className="cf-toast-message">{toast.message}</span>
            <button type="button" onClick={onDismiss} aria-label="Dismiss">
              <X size={16} />
            </button>
            <motion.div
              className="cf-toast-progress"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}