import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, ShieldCheck, MapPin, LogIn } from 'lucide-react';

const spring = { type: 'spring', stiffness: 300, damping: 30 };

export default function ContactSellerModal({ open, seller, listing, onProceed, onClose }) {
  if (!open || !listing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(16,28,58,.55)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.95 }}
        transition={spring}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 26,
          borderRadius: 26,
          background: '#fff',
          boxShadow: '0 30px 90px rgba(16,28,58,.3)',
          color: '#101C3A'
        }}
      >
        <div style={{
          width: 58, height: 58,
          display: 'grid', placeItems: 'center',
          borderRadius: 19,
          background: 'rgba(37,211,102,.12)',
          color: '#128C7E',
          marginBottom: 20
        }}>
          <MessageCircle size={28} />
        </div>

        <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.25, letterSpacing: -0.5 }}>
          Chat with the seller
        </h2>

        <p style={{ margin: '8px 0 20px', fontSize: 14, lineHeight: 1.6, color: '#4B5563' }}>
          Sign in to unlock the seller's WhatsApp number and start a conversation about this item.
        </p>

        {/* Item preview */}
        <div style={{
          display: 'flex',
          gap: 12,
          padding: 12,
          marginBottom: 20,
          borderRadius: 16,
          background: '#F5F8FF',
          border: '1px solid #E5EAF2'
        }}>
          {listing.image ? (
            <img
              src={listing.image}
              alt=""
              style={{
                width: 56, height: 56,
                borderRadius: 12,
                objectFit: 'cover',
                flexShrink: 0
              }}
            />
          ) : (
            <div style={{
              width: 56, height: 56,
              borderRadius: 12,
              background: '#E5EDFB',
              display: 'grid', placeItems: 'center',
              flexShrink: 0
            }}>
              <MessageCircle size={20} color="#2563EB" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {listing.title}
            </b>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: '#94A3B8' }}>
              <span>{seller?.business_name || seller?.display_name || 'CampusFlip Seller'}</span>
              {seller?.is_verified && <ShieldCheck size={12} color="#2563EB" />}
            </div>
            {listing.spotName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 11, color: '#94A3B8' }}>
                <MapPin size={10} /> {listing.spotName}
              </div>
            )}
          </div>
        </div>

        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: '0 0 22px',
          display: 'grid',
          gap: 8,
          fontSize: 13,
          color: '#4B5563'
        }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366' }} />
            Opens directly in WhatsApp
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366' }} />
            Your number stays private until you message
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366' }} />
            Free to sign up with your student email
          </li>
        </ul>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={onProceed}
            style={{
              width: '100%',
              border: 0,
              borderRadius: 14,
              padding: '15px 18px',
              background: '#2563EB',
              color: 'white',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 10px 24px rgba(37,99,235,.22)'
            }}
          >
            <LogIn size={16} />
            Sign in to contact seller
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{
              width: '100%',
              border: '1px solid #E5EAF2',
              borderRadius: 14,
              padding: 13,
              background: '#fff',
              color: '#4B5563',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Not now
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}