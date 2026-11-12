import { useCallback, useEffect, useRef } from 'react';
import { supabase } from './supabase';

export function useNotificationFeedback() {
  const audioContextRef = useRef(null);
  const hasUserInteracted = useRef(false);
  const prefsRef = useRef({
    sound_enabled: true,
    haptic_enabled: true,
  });

  // Load preferences once per session and keep them fresh
  useEffect(() => {
    let mounted = true;

    async function loadPrefs() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      const { data } = await supabase
        .from('notification_preferences')
        .select('sound_enabled, haptic_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (mounted && data) {
        prefsRef.current = {
          sound_enabled: data.sound_enabled !== false,
          haptic_enabled: data.haptic_enabled !== false,
        };
      }
    }

    loadPrefs();

    // Refresh when the user signs in or their session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPrefs();
    });

    // Refresh when preferences change (from the settings page)
    const channel = supabase
      .channel('notif-prefs-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notification_preferences' },
        (payload) => {
          if (payload.new) {
            prefsRef.current = {
              sound_enabled: payload.new.sound_enabled !== false,
              haptic_enabled: payload.new.haptic_enabled !== false,
            };
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Unlock audio on first user interaction (browser policy)
  if (typeof window !== 'undefined' && !hasUserInteracted.current) {
    const unlock = () => {
      hasUserInteracted.current = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  const playChime = useCallback(() => {
    if (!prefsRef.current.sound_enabled) return;
    if (!hasUserInteracted.current) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;

      const playNote = (freq, start, duration, volume = 0.12) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playNote(659.25, now, 0.18);
      playNote(880.00, now + 0.12, 0.25);
    } catch (err) {
      console.warn('Chime could not play:', err);
    }
  }, []);

  const vibrate = useCallback((pattern = [10, 30, 15]) => {
    if (!prefsRef.current.haptic_enabled) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch {}
    }
  }, []);

  const notify = useCallback(() => {
    playChime();
    vibrate();
  }, [playChime, vibrate]);

  return { notify, playChime, vibrate };
}