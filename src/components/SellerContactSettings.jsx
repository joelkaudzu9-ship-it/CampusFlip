import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Phone,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';

function normaliseMalawiPhone(value) {
  let digits = value.replace(/\D/g, '');

  // Convert local format to international format
  if (digits.startsWith('0')) {
    digits = '265' + digits.slice(1);
  } 
  // Handle numbers entered without the leading country code
  else if (digits.startsWith('88') || digits.startsWith('89') ||
           digits.startsWith('98') || digits.startsWith('99')) {
    digits = '265' + digits;
  }

  // Accept only the supported Malawi mobile prefixes
  const valid = /^265(88|89|98|99)\d{7}$/;

  return valid.test(digits) ? digits : null;
}

export default function SellerContactSettings({ session }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadContact() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('seller_contacts')
        .select('whatsapp_number')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
      } else {
        setPhone(data?.whatsapp_number || '');
      }

      setLoading(false);
    }

    loadContact();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  async function saveContact(event) {
    event.preventDefault();

    setError('');
    setNotice('');

    const normalised = normaliseMalawiPhone(phone);

    if (!normalised) {
      setError(
        'Enter a valid Malawi mobile number, for example 0991234567 or +265 991 234 567.'
      );
      return;
    }

    if (!session?.user?.id) {
      setError('Please sign in again before saving your number.');
      return;
    }

    setSaving(true);

    const { error: saveError } = await supabase
      .from('seller_contacts')
      .upsert(
        {
          user_id: session.user.id,
          whatsapp_number: normalised
        },
        {
          onConflict: 'user_id'
        }
      );

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setPhone(normalised);
    setNotice('Your WhatsApp number has been saved.');
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: 20,
        marginBottom: 22,
        borderRadius: 22,
        background: 'rgba(255,255,255,.92)',
        border: '1px solid #e5ebf4',
        boxShadow: '0 8px 24px rgba(16,38,92,.055)',
        color: '#10265C'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 15
      }}>
        <div style={{
          width: 44,
          height: 44,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 15,
          background: '#e8f8ef',
          color: '#16845b'
        }}>
          <MessageCircle size={22} />
        </div>

        <div>
          <h3 style={{
            fontSize: 16,
            margin: 0,
            fontWeight: 800
          }}>
            WhatsApp contact
          </h3>
          <p style={{
            margin: '4px 0 0',
            fontSize: 12,
            color: '#71809a'
          }}>
            Let buyers contact you about your listings.
          </p>
        </div>
      </div>

      <form onSubmit={saveContact}>
        <label style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 700,
          color: '#52627c',
          marginBottom: 8
        }}>
          Your WhatsApp number
        </label>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 13px',
          border: '1px solid #dce5f1',
          borderRadius: 13,
          background: '#f9fbfe'
        }}>
          <Phone size={17} color="#71809a" />

          <input
            type="tel"
            value={phone}
            onChange={event => {
              setPhone(event.target.value);
              setNotice('');
              setError('');
            }}
            placeholder="0991 234 567"
            autoComplete="tel"
            style={{
              flex: 1,
              minWidth: 0,
              padding: '14px 0',
              border: 0,
              outline: 'none',
              background: 'transparent',
              color: '#10265C',
              fontSize: 14
            }}
          />
        </div>

        <p style={{
          margin: '8px 0 15px',
          color: '#8491a5',
          fontSize: 11,
          lineHeight: 1.6
        }}>
          Use a Malawi mobile number. Buyers will be able to contact you
          through the WhatsApp button on your active listings. Your number
          is not displayed publicly in your seller profile.
        </p>

        {error && (
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            color: '#b42318',
            fontSize: 12,
            lineHeight: 1.5,
            marginBottom: 12
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            color: '#16845b',
            fontSize: 12,
            marginBottom: 12
          }}>
            <CheckCircle2 size={16} />
            {notice}
          </div>
        )}

        <motion.button
          whileTap={{ scale: .98 }}
          type="submit"
          disabled={loading || saving}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            padding: 13,
            border: 0,
            borderRadius: 13,
            background: '#1769E8',
            color: 'white',
            fontSize: 13,
            fontWeight: 800,
            cursor: saving ? 'wait' : 'pointer',
            opacity: loading || saving ? .65 : 1
          }}
        >
          {loading || saving
            ? <LoaderCircle size={17} />
            : <Save size={17} />}
          {loading
            ? 'Loading contact...'
            : saving
              ? 'Saving...'
              : 'Save WhatsApp number'}
        </motion.button>
      </form>
    </motion.section>
  );
}