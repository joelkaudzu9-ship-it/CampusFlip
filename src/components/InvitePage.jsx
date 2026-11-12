import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, ArrowRight, ShieldCheck, LoaderCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const spring = { type: 'spring', stiffness: 300, damping: 30 };

export default function InvitePage({ code, onEnter }) {
  const [referrer, setReferrer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, business_name, avatar_url')
        .eq('referral_code', code)
        .maybeSingle();
      if (!cancelled) {
        setReferrer(data || null);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [code]);

  const name = referrer?.business_name?.trim() || referrer?.display_name?.trim() || 'a CampusFlip seller';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      background: 'radial-gradient(ellipse at 50% 25%, #F5F8FF 0%, #E5EDFB 100%)',
      textAlign: 'center'
    }}>
      {loading ? (
        <span className="cf-block-loader"></span>
      ) : (
        <>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
            style={{
              width: 88, height: 88,
              borderRadius: 26,
              background: '#101C3A',
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 22,
              position: 'relative',
              boxShadow: '0 18px 45px rgba(16,28,58,.28)'
            }}
          >
            <Gift size={40} strokeWidth={2.2} />
            <span style={{
              position: 'absolute',
              top: 14, right: 14,
              width: 10, height: 10,
              borderRadius: '50%',
              background: '#F5A623'
            }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            style={{ maxWidth: 420 }}
          >
            <span style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 2,
              color: '#2563EB',
              display: 'block',
              marginBottom: 12
            }}>
              YOU'VE BEEN INVITED
            </span>

            <h1 style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 850,
              letterSpacing: -1,
              lineHeight: 1.15,
              color: '#101C3A'
            }}>
              {referrer ? (
                <>
                  {name} invited you to<br />
                  CampusFlip.
                </>
              ) : (
                'Join CampusFlip.'
              )}
            </h1>

            <p style={{
              margin: '16px 0 28px',
              fontSize: 15,
              lineHeight: 1.6,
              color: '#4B5563'
            }}>
              Sign up and start buying and selling on campus in minutes.
              Your first listing fee is on us.
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 24
            }}>
              {[
                'Free student signup with your email',
                'One free listing (worth MK 200)',
                'Trusted sellers, safe campus meetings'
              ].map(line => (
                <div key={line} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,.75)',
                  border: '1px solid rgba(255,255,255,.95)',
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#101C3A',
                  textAlign: 'left'
                }}>
                  <ShieldCheck size={16} color="#2563EB" />
                  {line}
                </div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onEnter}
              style={{
                width: '100%',
                border: 0,
                borderRadius: 16,
                padding: 16,
                background: '#2563EB',
                color: 'white',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 12px 30px rgba(37,99,235,.3)'
              }}
            >
              Create my account
              <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </>
      )}
    </div>
  );
}