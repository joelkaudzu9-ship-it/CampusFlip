import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

export function usePaymentStatus({ chargeId, onStatus, timeoutMs = 90000 }) {
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!chargeId) return;

    let active = true;
    let channel = null;
    let timeoutId = null;

    function fire(status) {
      if (!active) return;
      active = false;
      onStatusRef.current?.(status);
      if (channel) supabase.removeChannel(channel);
      if (timeoutId) clearTimeout(timeoutId);
    }

    async function checkOnce() {
      const { data, error } = await supabase
        .from('payments')
        .select('status')
        .eq('charge_id', chargeId)
        .maybeSingle();

      if (!active || error || !data) return;
      if (data.status === 'successful' || data.status === 'failed') {
        fire(data.status);
      }
    }

    function handleChange(payload) {
      const status = payload.new?.status;
      if (status === 'successful' || status === 'failed') {
        fire(status);
      }
    }

    checkOnce();

    channel = supabase
      .channel(`payment-${chargeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `charge_id=eq.${chargeId}`,
        },
        handleChange
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `charge_id=eq.${chargeId}`,
        },
        handleChange
      )
      .subscribe();

    timeoutId = setTimeout(() => {
      if (active) fire('timeout');
    }, timeoutMs);

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [chargeId, timeoutMs]);
}