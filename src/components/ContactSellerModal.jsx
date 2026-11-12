import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, ShieldCheck, MapPin, ArrowRight, Eye, Clock,
  Check, Lock, Smartphone
} from 'lucide-react';

const spring = { type: 'spring', stiffness: 300, damping: 30 };

const QUICK_REPLIES = [
  { id: 'available', label: 'Is this still available?', text: 'Hi! Is this still available on CampusFlip?' },
  { id: 'negotiate', label: 'Can you do a lower price?', text: 'Hi! I saw your listing on CampusFlip. Can we discuss the price?' },
  { id: 'meet', label: 'When can we meet?', text: 'Hi! I found your listing on CampusFlip. When and where can we meet?' },
];

export default function ContactSellerModal({ open, seller, listing, onProceed, onClose }) {
  const [selectedReply, setSelectedReply] = useState(QUICK_REPLIES[0].id);

  if (!open || !listing) return null;

  const sellerName = seller?.business_name || seller?.display_name || 'CampusFlip Seller';
  const sellerInitial = sellerName.trim().charAt(0).toUpperCase();

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
        WebkitBackdropFilter: 'blur(14px)',
        overflowY: 'auto',
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
          maxWidth: 440,
          marginBlock: 'auto',
          padding: 0,
          borderRadius: 26,
          background: '#fff',
          boxShadow: '0 30px 90px rgba(16,28,58,.3)',
          color: '#101C3A',
          overflow: 'hidden',
          maxHeight: 'calc(100dvh - 40px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 24px 18px',
            background: 'linear-gradient(135deg, #EFFAF6 0%, #D6F5E7 100%)',
            borderBottom: '1px solid #E5EAF2',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexShrink: 0,
          }}
        >
          <motion.div
            initial={{ scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            style={{
              width: 52, height: 52,
              display: 'grid', placeItems: 'center',
              borderRadius: 16,
              background: '#25D366',
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 8px 20px rgba(37,211,102,.35)',
            }}
          >
            <MessageCircle size={26} />
          </motion.div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 10, fontWeight: 900, letterSpacing: 1.3,
              color: '#15803D', marginBottom: 3,
            }}>
              CONTINUE ON WHATSAPP
            </div>
            <h2 style={{
              margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: -0.3,
              color: '#101C3A', lineHeight: 1.25,
            }}>
              Chat with {sellerName.split(' ')[0] || 'the seller'}
            </h2>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

          {/* Seller + item preview */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            marginBottom: 18,
            borderRadius: 16,
            background: '#F5F8FF',
            border: '1px solid #E5EAF2',
          }}>
            <div style={{
              width: 44, height: 44, flexShrink: 0,
              borderRadius: 12, overflow: 'hidden',
              background: seller?.is_verified ? '#E1EBFF' : '#F1F5F9',
              color: '#2563EB',
              display: 'grid', placeItems: 'center',
              fontSize: 16, fontWeight: 800,
            }}>
              {seller?.avatar_url
                ? <img src={seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : sellerInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <b style={{
                  fontSize: 13, color: '#101C3A',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', maxWidth: '80%',
                }}>
                  {sellerName}
                </b>
                {seller?.is_verified && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 2,
                    fontSize: 9, fontWeight: 800,
                    padding: '2px 6px', borderRadius: 20,
                    background: '#2563EB', color: '#fff',
                  }}>
                    <ShieldCheck size={9} /> Verified
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: 11, color: '#94A3B8' }}>
                <Clock size={10} />
                Typically replies within 2 hours
              </div>
            </div>
          </div>

          {/* Item preview */}
          <div style={{
            display: 'flex',
            gap: 12,
            padding: 12,
            marginBottom: 20,
            borderRadius: 14,
            background: '#fff',
            border: '1px solid #E5EAF2',
          }}>
            {listing.image ? (
              <img
                src={listing.image}
                alt=""
                style={{
                  width: 52, height: 52, borderRadius: 10,
                  objectFit: 'cover', flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: 10,
                background: '#E5EDFB',
                display: 'grid', placeItems: 'center',
                flexShrink: 0,
              }}>
                <MessageCircle size={18} color="#2563EB" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{
                display: 'block', fontSize: 13,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {listing.title}
              </b>
              {listing.spotName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 11, color: '#94A3B8' }}>
                  <MapPin size={10} /> {listing.spotName}
                </div>
              )}
            </div>
          </div>

          {/* Quick reply templates */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: 1,
              color: '#94A3B8', marginBottom: 8,
            }}>
              PICK YOUR FIRST MESSAGE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {QUICK_REPLIES.map(reply => {
                const selected = selectedReply === reply.id;
                return (
                  <motion.button
                    key={reply.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedReply(reply.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 13px',
                      borderRadius: 12,
                      border: selected ? '1.5px solid #25D366' : '1px solid #E5EAF2',
                      background: selected ? '#F0FDF4' : '#fff',
                      color: '#101C3A',
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, flexShrink: 0,
                      borderRadius: '50%',
                      border: selected ? '0' : '1.5px solid #CBD5E1',
                      background: selected ? '#25D366' : 'transparent',
                      display: 'grid', placeItems: 'center',
                    }}>
                      {selected && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ flex: 1 }}>{reply.label}</span>
                  </motion.button>
                );
              })}
            </div>
            <p style={{
              margin: '10px 0 0',
              fontSize: 11,
              color: '#94A3B8',
              lineHeight: 1.5,
            }}>
              This message opens in WhatsApp. You can edit it before sending.
            </p>
          </div>

          {/* What happens next */}
          <div style={{
            padding: 14,
            borderRadius: 14,
            background: '#F8FBFF',
            border: '1px solid #E5EAF2',
            marginBottom: 4,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#101C3A', marginBottom: 10 }}>
              What happens next
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: Lock, text: "Sign in so we know who's buying" },
                { icon: MessageCircle, text: 'WhatsApp opens with your message' },
                { icon: Smartphone, text: 'Arrange a safe meeting spot on campus' },
              ].map((step, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 12, color: '#4B5563',
                }}>
                  <div style={{
                    width: 20, height: 20, flexShrink: 0,
                    borderRadius: 6,
                    background: '#E5EDFB',
                    color: '#2563EB',
                    display: 'grid', placeItems: 'center',
                    fontSize: 10, fontWeight: 800,
                  }}>
                    {i + 1}
                  </div>
                  <step.icon size={13} color="#94A3B8" style={{ flexShrink: 0 }} />
                  <span>{step.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div style={{
          padding: '16px 24px calc(16px + env(safe-area-inset-bottom))',
          borderTop: '1px solid #E5EAF2',
          background: '#fff',
          flexShrink: 0,
        }}>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onProceed?.(selectedReply)}
            style={{
              width: '100%',
              border: 0,
              borderRadius: 14,
              padding: '15px 18px',
              background: '#25D366',
              color: '#fff',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 10px 24px rgba(37,211,102,.28)',
            }}
          >
            Sign in and continue
            <ArrowRight size={16} />
          </motion.button>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 8,
              padding: 10,
              border: 0,
              background: 'transparent',
              color: '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Not now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}