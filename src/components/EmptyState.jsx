import React from 'react';
import { motion } from 'framer-motion';
import { Search, Plus } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = Search, 
  title = "No items found", 
  message = "Try adjusting your search or filters.",
  actionLabel,
  onAction
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 24,
        border: '1px dashed #D6E0EF',
        minHeight: 260
      }}
    >
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: 'rgba(37, 99, 235, 0.08)',
        color: '#2563EB',
        display: 'grid',
        placeItems: 'center',
        marginBottom: 16
      }}>
        <Icon size={30} />
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#101C3A' }}>{title}</h3>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: '#94A3B8', maxWidth: 300 }}>
        {message}
      </p>
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAction}
          style={{
            padding: '12px 24px',
            borderRadius: 12,
            background: '#2563EB',
            color: 'white',
            fontWeight: 700,
            fontSize: 14,
            border: 0,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
          }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}