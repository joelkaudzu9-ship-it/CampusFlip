import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
  UserRound, Store, Phone, Mail, Save, X, Camera, Trash2, LoaderCircle,
} from 'lucide-react';
import ShopPlanUpgrade from './ShopPlanUpgrade';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const springPhysics = { type: "spring", stiffness: 300, damping: 28, mass: 0.8 };

export default function AccountSettings({ session, onClose, onBack, onToast }) {
  const avatarInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const [isVerified, setIsVerified] = useState(false);
  const [planExpiresAt, setPlanExpiresAt] = useState(null);

  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const userId = session?.user?.id;
      if (!userId) { setLoading(false); return; }

      const [profileResult, contactResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, business_name, avatar_url, is_verified, shop_plan_expires_at')
          .eq('id', userId)
          .single(),

        supabase
          .from('seller_contacts')
          .select('whatsapp_number')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (!mounted) return;

      if (profileResult.error) {
        onToast?.('Could not load your profile.', 'error');
      } else {
        setDisplayName(profileResult.data?.display_name || '');
        setBusinessName(profileResult.data?.business_name || '');
        setAvatarUrl(profileResult.data?.avatar_url || '');
        setIsVerified(profileResult.data?.is_verified || false);
        setPlanExpiresAt(profileResult.data?.shop_plan_expires_at || null);
      }

      if (!contactResult.error) {
        setWhatsapp(contactResult.data?.whatsapp_number || '');
      }
      setLoading(false);
    }

    loadProfile();
    return () => { mounted = false; };
  }, [session?.user?.id, onToast]);

  useEffect(() => {
    if (!avatarPreview) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  function handleAvatarSelection(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      onToast?.('Please choose a JPG, PNG or WebP image.', 'error'); return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      onToast?.('Your profile picture must be 5 MB or smaller.', 'error'); return;
    }

    setAvatarPreview(URL.createObjectURL(file));
    uploadAvatar(file);
  }

  async function uploadAvatar(file) {
    if (!session?.user?.id) { onToast?.('Please sign in before uploading a picture.', 'error'); return; }
    setAvatarUploading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session) throw new Error('Your session has expired. Please sign in again.');

      const { data: signedData, error: signError } = await supabase.functions.invoke('cloudinary-sign');
      if (signError) throw signError;
      if (!signedData?.signature || !signedData?.cloud_name) throw new Error('Could not obtain an upload signature.');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signedData.api_key);
      formData.append('timestamp', String(signedData.timestamp));
      formData.append('folder', signedData.folder);
      formData.append('signature', signedData.signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${signedData.cloud_name}/image/upload`,
        { method: 'POST', body: formData }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Cloudinary upload failed.');

      const { error: databaseError } = await supabase
        .from('profiles')
        .update({ avatar_url: result.secure_url })
        .eq('id', session.user.id);

      if (databaseError) throw databaseError;

      setAvatarUrl(result.secure_url);
      setAvatarPreview('');
      onToast?.('Profile picture updated.');
    } catch (err) {
      console.error('Profile picture upload error:', err);
      setAvatarPreview('');
      onToast?.(err.message || 'Could not upload your profile picture.', 'error');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function removeAvatar() {
    if (!session?.user?.id || !avatarUrl) return;
    setAvatarUploading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', session.user.id);

      if (error) throw error;

      setAvatarUrl('');
      setAvatarPreview('');
      onToast?.('Profile picture removed.');
    } catch (err) {
      console.error('Profile picture removal error:', err);
      onToast?.(err.message || 'Could not remove your picture.', 'error');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!displayName.trim()) { onToast?.('Please enter your full name.', 'error'); return; }
    if (avatarUploading) { onToast?.('Please wait for your picture upload to finish.', 'error'); return; }

    setSaving(true);
    const userId = session.user.id;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          business_name: businessName.trim() || null,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      const cleanPhone = whatsapp.replace(/\s+/g, '');
      let contactError = null;

      if (cleanPhone) {
        const { error } = await supabase
          .from('seller_contacts')
          .upsert({ user_id: userId, whatsapp_number: cleanPhone }, { onConflict: 'user_id' });
        contactError = error;
      } else {
        const { error } = await supabase.from('seller_contacts').delete().eq('user_id', userId);
        contactError = error;
      }

      if (contactError) throw new Error('Profile saved, but WhatsApp could not be updated: ' + contactError.message);

      onToast?.('Your profile has been updated.');
      // Use onBack so history stays balanced
      onBack?.();
    } catch (err) {
      console.error('Profile save error:', err);
      onToast?.(err.message || 'Could not save your profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const initials = (displayName || businessName || 'C').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
  const currentAvatar = avatarPreview || avatarUrl;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
        <span className="cf-block-loader"></span>
        <span style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600 }}>Loading your settings...</span>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springPhysics} className="cf-settings-form" style={{ padding: '4px 0' }}>
      <div className="cf-settings-heading" style={{ marginBottom: 24 }}>
        <div>
          <span className="cf-eyebrow">ACCOUNT SETTINGS</span>
          <h2>Personal details</h2>
          <p>Keep your CampusFlip profile up to date.</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} type="button" className="cf-icon-close" onClick={onBack || onClose} aria-label="Close settings">
          <X size={19} />
        </motion.button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 24, borderBottom: '1px solid #E5EAF2', marginBottom: 24 }}>
        <div style={{ position: 'relative', width: 104, height: 104, marginBottom: 14 }}>
          <motion.div initial={false} animate={{ scale: avatarUploading ? 0.95 : 1 }} transition={springPhysics} style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center', background: '#E8F0FF', color: '#2563EB', border: '4px solid white', boxShadow: '0 5px 22px rgba(16,28,58,.13)', fontSize: 28, fontWeight: 800 }}>
            <AnimatePresence mode="wait">
              <motion.div key={currentAvatar || 'initials'} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={springPhysics} style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                {currentAvatar ? <img src={currentAvatar} alt="Your profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} aria-label="Upload profile picture" style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, display: 'grid', placeItems: 'center', border: '3px solid white', borderRadius: '50%', background: '#2563EB', color: 'white', cursor: avatarUploading ? 'wait' : 'pointer', boxShadow: '0 3px 10px rgba(37,99,235,.25)' }}>
            {avatarUploading ? <LoaderCircle size={16} className="cf-spin" /> : <Camera size={16} />}
          </motion.button>
        </div>

        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarSelection} disabled={avatarUploading} />

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #DCE6F5', borderRadius: 10, background: 'white', color: '#2563EB', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Camera size={14} /> Change picture
          </motion.button>
          {avatarUrl && (
            <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={removeAvatar} disabled={avatarUploading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #F1DDDD', borderRadius: 10, background: 'white', color: '#C34A4A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Trash2 size={14} /> Remove
            </motion.button>
          )}
        </div>
        <span style={{ color: '#94A3B8', fontSize: 11, marginTop: 12 }}>JPG, PNG or WebP · Max 5 MB</span>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label className="cf-settings-field" style={{ marginBottom: 0 }}>
          <span><UserRound size={16} /> Full name</span>
          <motion.input whileFocus={{ scale: 1.01 }} transition={springPhysics} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Your full name" required maxLength={80} style={{ transition: 'box-shadow 0.2s', boxShadow: '0 0 0 0px rgba(37,99,235,0)' }} />
        </label>

        <label className="cf-settings-field" style={{ marginBottom: 0 }}>
          <span><Store size={16} /> Business name <small>Optional</small></span>
          <motion.input whileFocus={{ scale: 1.01 }} transition={springPhysics} value={businessName} onChange={event => setBusinessName(event.target.value)} placeholder="Your shop or business name" maxLength={100} />
        </label>

        <label className="cf-settings-field" style={{ marginBottom: 0 }}>
          <span><Mail size={16} /> Email address</span>
          <input value={session?.user?.email || ''} readOnly style={{ opacity: 0.6 }} />
        </label>

        <label className="cf-settings-field" style={{ marginBottom: 0 }}>
          <span><Phone size={16} /> WhatsApp number</span>
          <motion.input whileFocus={{ scale: 1.01 }} transition={springPhysics} value={whatsapp} onChange={event => setWhatsapp(event.target.value)} placeholder="e.g. 0991234567" inputMode="tel" />
          <small>Buyers use this number to contact you about active listings.</small>
        </label>

        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} className="cf-settings-save" type="submit" disabled={saving || avatarUploading} style={{ marginTop: 8 }}>
          {saving ? <LoaderCircle size={17} className="cf-spin" /> : <Save size={17} />}
          {saving ? 'Saving changes...' : 'Save changes'}
        </motion.button>
      </form>

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #E5EAF2' }}>
        <ShopPlanUpgrade
          initialPhone={whatsapp}
          onToast={onToast}
          isVerified={isVerified}
          planExpiresAt={planExpiresAt}
          onPlanActivated={() => {
            setIsVerified(true);
            onToast?.('Your verified shop plan is active!');
          }}
        />
      </div>
    </motion.div>
  );
}