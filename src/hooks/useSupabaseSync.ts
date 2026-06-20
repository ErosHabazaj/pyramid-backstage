import { useEffect } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchUnits, seedUnitsIfEmpty, subscribeUnits } from '@/lib/assetUnitsRepo';
import { useStore } from '@/store/useStore';
import { SEED_ASSET_UNITS } from '@/data/seed';

// ── Realtime bridge ──────────────────────────────────────────────────
// On mount (when Supabase is configured): seed the table if empty, load
// current carts, then subscribe to live changes. Every connected device
// reflects a QR scan instantly. No-op without credentials → seed data.

export function useSupabaseSync() {
  const setAssetUnits = useStore((s) => s.setAssetUnits);
  const applyUnitChange = useStore((s) => s.applyUnitChange);
  const setRealtimeStatus = useStore((s) => s.setRealtimeStatus);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setRealtimeStatus('off');
      return;
    }
    let unsubscribe = () => {};
    let cancelled = false;

    (async () => {
      try {
        setRealtimeStatus('connecting');
        await seedUnitsIfEmpty(SEED_ASSET_UNITS);
        const units = await fetchUnits();
        if (cancelled) return;
        if (units.length) setAssetUnits(units);
        unsubscribe = subscribeUnits(applyUnitChange);
        setRealtimeStatus('on');
      } catch (err) {
        console.error('Supabase sync failed:', err);
        setRealtimeStatus('off');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setAssetUnits, applyUnitChange, setRealtimeStatus]);
}
