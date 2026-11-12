import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, UserRound, Store, Phone, Mail, Save, Camera,
  Trash2, LoaderCircle, ShieldCheck, ImagePlus, CheckCircle2,
} from 'lucide-react';
import ShopPlanUpgrade from './ShopPlanUpgrade';
import './account-pages.css';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const spring = { type: 'spring', stiffness: 280, damping: 26, mass: 0.8 };

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

      if (!userId) {
        setLoading(false);
        return;
      }

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
      onToast?.('Please choose a JPG, PNG or WebP image.', 'error');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      onToast?.('Your profile picture must be 5 MB or smaller.', 'error');
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
    uploadAvatar(file);
  }

  async function uploadAvatar(file) {
    if (!session?.user?.id) {
      onToast?.('Please sign in before uploading a picture.', 'error');
      return;
    }

    setAvatarUploading(true);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!sessionData?.session) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const { data: signedData, error: signError } =
        await supabase.functions.invoke('cloudinary-sign');

      if (signError) throw signError;

      if (!signedData?.signature || !signedData?.cloud_name) {
        throw new Error('Could not obtain an upload signature.');
      }

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

      if (!response.ok) {
        throw new Error(result.error?.message || 'Cloudinary upload failed.');
      }

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

    if (!displayName.trim()) {
      onToast?.('Please enter your full name.', 'error');
      return;
    }

    if (avatarUploading) {
      onToast?.('Please wait for your picture upload to finish.', 'error');
      return;
    }

    if (!session?.user?.id) {
      onToast?.('Please sign in again before saving.', 'error');
      return;
    }

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
          .upsert(
            { user_id: userId, whatsapp_number: cleanPhone },
            { onConflict: 'user_id' }
          );

        contactError = error;
      } else {
        const { error } = await supabase
          .from('seller_contacts')
          .delete()
          .eq('user_id', userId);

        contactError = error;
      }

      if (contactError) {
        throw new Error(
          'Profile saved, but WhatsApp could not be updated: ' +
          contactError.message
        );
      }

      onToast?.('Your profile has been updated.');
      onBack?.();
    } catch (err) {
      console.error('Profile save error:', err);
      onToast?.(err.message || 'Could not save your profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const initials = (displayName || businessName || 'C')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  const currentAvatar = avatarPreview || avatarUrl;
  const leaveSettings = onBack || onClose;

  if (loading) {
    return (
      <main className="cf-settings-page cf-settings-loading">
        <span className="cf-block-loader" />
        <span>Loading your personal workspace...</span>
      </main>
    );
  }

  return (
    <motion.main
      className="cf-settings-page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <header className="cf-settings-topbar">
        <motion.button
          type="button"
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.92 }}
          onClick={leaveSettings}
          className="cf-account-back"
          aria-label="Go back"
        >
          <ArrowLeft size={19} />
        </motion.button>

        <div>
          <span className="cf-account-overline">CAMPUSFLIP / PROFILE</span>
          <h1>Personal details</h1>
        </div>

        <span className="cf-settings-secure-label">
          <ShieldCheck size={15} /> Account
        </span>
      </header>

      <section className="cf-settings-intro">
        <div>
          <span className="cf-account-overline">YOUR IDENTITY, YOUR WAY</span>
          <h2>Make it <em>yours.</em></h2>
          <p>
            Keep your profile current so people on CampusFlip know who they're
            buying from and how to reach you.
          </p>
        </div>

        <div className="cf-settings-intro-art" aria-hidden="true">
          <UserRound size={42} strokeWidth={1.2} />
          <span><CheckCircle2 size={17} /></span>
        </div>
      </section>

      <div className="cf-settings-layout">
        <aside className="cf-settings-sidebar">
          <div className="cf-settings-avatar-card">
            <span className="cf-account-overline">PROFILE PREVIEW</span>

            <div className="cf-settings-avatar-wrap">
              <motion.div
                className="cf-settings-avatar"
                animate={{ scale: avatarUploading ? 0.96 : 1 }}
                transition={spring}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentAvatar || 'initials'}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    transition={spring}
                    className="cf-settings-avatar-content"
                  >
                    {currentAvatar
                      ? <img src={currentAvatar} alt="Your profile" />
                      : <span>{initials}</span>}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="cf-settings-avatar-camera"
                aria-label="Upload profile picture"
              >
                {avatarUploading
                  ? <LoaderCircle size={17} className="cf-spin" />
                  : <Camera size={17} />}
              </motion.button>
            </div>

            <h3>{displayName || 'Your name'}</h3>
            <p>{session?.user?.email || 'Your email address'}</p>

            {businessName && (
              <span className="cf-settings-business-preview">
                <Store size={13} /> {businessName}
              </span>
            )}

            <div className="cf-settings-avatar-actions">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
              >
                <ImagePlus size={15} /> Change photo
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={avatarUploading}
                  className="cf-settings-remove-photo"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={handleAvatarSelection}
              disabled={avatarUploading}
            />

            <span className="cf-settings-image-note">
              JPG, PNG or WebP · Maximum 5 MB
            </span>
          </div>

          <div className="cf-settings-sidebar-note">
            <span><ShieldCheck size={17} /></span>
            <div>
              <strong>Your account stays yours.</strong>
              <p>Your email address is displayed for reference and cannot be changed here.</p>
            </div>
          </div>
        </aside>

        <section className="cf-settings-main">
          <form onSubmit={handleSave} className="cf-settings-form">
            <div className="cf-settings-form-heading">
              <div>
                <span className="cf-account-overline">01 — PERSONAL INFORMATION</span>
                <h3>Profile information</h3>
                <p>These details help identify you across the marketplace.</p>
              </div>
              <UserRound size={22} />
            </div>

            <div className="cf-settings-fields">
              <label className="cf-settings-input-group">
                <span><UserRound size={15} /> Full name <i>Required</i></span>
                <input
                  value={displayName}
                  onChange={event => setDisplayName(event.target.value)}
                  placeholder="Enter your full name"
                  required
                  maxLength={80}
                />
                <small>Your name as it appears to other CampusFlip members.</small>
              </label>

              <label className="cf-settings-input-group">
                <span><Store size={15} /> Business name <i>Optional</i></span>
                <input
                  value={businessName}
                  onChange={event => setBusinessName(event.target.value)}
                  placeholder="Your shop or business name"
                  maxLength={100}
                />
                <small>Give your shop a recognisable identity.</small>
              </label>

              <label className="cf-settings-input-group">
                <span><Mail size={15} /> Email address</span>
                <input
                  value={session?.user?.email || ''}
                  readOnly
                  className="cf-settings-readonly"
                />
                <small>Your sign-in email address cannot be edited here.</small>
              </label>

              <label className="cf-settings-input-group">
                <span><Phone size={15} /> WhatsApp number <i>Optional</i></span>
                <input
                  value={whatsapp}
                  onChange={event => setWhatsapp(event.target.value)}
                  placeholder="e.g. 0991234567"
                  inputMode="tel"
                />
                <small>
                  Buyers use this number to contact you about your active listings.
                </small>
              </label>
            </div>

            <div className="cf-settings-form-bottom">
              <span className="cf-settings-save-hint">
                <ShieldCheck size={15} /> Your changes are saved securely.
              </span>

              <motion.button
                type="submit"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                disabled={saving || avatarUploading}
                className="cf-settings-save-button"
              >
                {saving
                  ? <LoaderCircle size={17} className="cf-spin" />
                  : <Save size={17} />}
                {saving ? 'Saving changes...' : 'Save changes'}
              </motion.button>
            </div>
          </form>

          <motion.section
            className="cf-settings-shop-plan"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.12 }}
          >
            <div className="cf-settings-form-heading">
              <div>
                <span className="cf-account-overline">02 — SELLER TOOLS</span>
                <h3>Your shop plan</h3>
                <p>Manage your seller verification and shop plan.</p>
              </div>
              <Store size={22} />
            </div>

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
          </motion.section>
        </section>
      </div>
    </motion.main>
  );
}