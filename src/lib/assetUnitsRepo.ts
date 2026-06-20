import { supabase } from './supabase';
import type { AssetUnit, AssetUnitStatus } from '@/domain/types';

// ── asset_units repository + realtime ────────────────────────────────
// The only table that mutates live (QR scans relocate carts). Persisting
// it + subscribing makes the scan-updates-the-map moment sync across
// devices. All functions no-op when Supabase isn't configured.

const TABLE = 'asset_units';

interface Row {
  id: string;
  asset_type_id: string;
  qr_code: string;
  quantity: number;
  location_space_id: string;
  status: AssetUnitStatus;
  reserved_for_event_id: string | null;
}

const fromRow = (r: Row): AssetUnit => ({
  id: r.id,
  assetTypeId: r.asset_type_id,
  qrCode: r.qr_code,
  quantity: r.quantity,
  locationSpaceId: r.location_space_id,
  status: r.status,
  reservedForEventId: r.reserved_for_event_id ?? undefined,
});

const toRow = (u: AssetUnit): Row => ({
  id: u.id,
  asset_type_id: u.assetTypeId,
  qr_code: u.qrCode,
  quantity: u.quantity,
  location_space_id: u.locationSpaceId,
  status: u.status,
  reserved_for_event_id: u.reservedForEventId ?? null,
});

export async function fetchUnits(): Promise<AssetUnit[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(TABLE).select('*');
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

/** Upload seed carts the first time the table is empty. */
export async function seedUnitsIfEmpty(seed: AssetUnit[]): Promise<void> {
  if (!supabase) return;
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  if ((count ?? 0) === 0) {
    const { error: insErr } = await supabase.from(TABLE).insert(seed.map(toRow));
    if (insErr) throw insErr;
  }
}

/** Persist a relocation (location + status). Fire-and-forget from the store. */
export async function persistUnit(unit: AssetUnit): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from(TABLE)
    .update({ location_space_id: unit.locationSpaceId, status: unit.status })
    .eq('id', unit.id);
  if (error) throw error;
}

/** Subscribe to live changes; returns an unsubscribe function. */
export function subscribeUnits(onChange: (u: AssetUnit) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel('asset_units_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        const row = payload.new as Row;
        if (row && row.id) onChange(fromRow(row));
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
