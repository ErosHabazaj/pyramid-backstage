import type {
  AssetType,
  Reservation,
  Space,
  TimeWindow,
} from './types';

// ── Conflict engine ──────────────────────────────────────────────────
// Deterministic, never AI. Three passes over the reservation timeline:
//   1. space double-booking (incl. setup/teardown buffers)
//   2. asset over-allocation (demand exceeds available stock)
//   3. spillover / adjacency (soft warnings on shared informal spaces)

export interface SpaceConflict {
  kind: 'space';
  severity: 'blocker';
  spaceId: string;
  events: string[];
  message: string;
}

export interface AssetConflict {
  kind: 'asset';
  severity: 'blocker';
  assetTypeId: string;
  shortfall: number;
  window: { start: string; end: string };
  events: string[];
  message: string;
}

export interface SpilloverConflict {
  kind: 'spillover';
  severity: 'warning';
  spaceId: string;
  events: string[];
  message: string;
}

export type Conflict = SpaceConflict | AssetConflict | SpilloverConflict;

/** Two windows overlap when their full footprints (setup→teardown) intersect. */
export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.setupStart < b.teardownEnd && b.setupStart < a.teardownEnd;
}

export function detectSpaceConflicts(
  reservations: Reservation[],
  spaces: Space[],
): Array<SpaceConflict | SpilloverConflict> {
  const soft = new Set(
    spaces
      .filter((s) => s.type === 'atrium' || s.type === 'corridor' || s.type === 'entrance')
      .map((s) => s.id),
  );
  const out: Array<SpaceConflict | SpilloverConflict> = [];
  for (let i = 0; i < reservations.length; i++) {
    for (let j = i + 1; j < reservations.length; j++) {
      const a = reservations[i];
      const b = reservations[j];
      if (a.spaceId !== b.spaceId) continue;
      if (!windowsOverlap(a.window, b.window)) continue;
      const name = spaces.find((s) => s.id === a.spaceId)?.name ?? a.spaceId;
      if (soft.has(a.spaceId)) {
        out.push({
          kind: 'spillover',
          severity: 'warning',
          spaceId: a.spaceId,
          events: [a.eventId, b.eventId],
          message: `${name} is shared by two overlapping events — confirm they can coexist.`,
        });
      } else {
        out.push({
          kind: 'space',
          severity: 'blocker',
          spaceId: a.spaceId,
          events: [a.eventId, b.eventId],
          message: `${name} is double-booked across two events (setup-to-teardown overlap).`,
        });
      }
    }
  }
  return out;
}

/**
 * Sweep-line over reservation boundaries per asset type. At every instant
 * where total reserved demand exceeds available stock, emit a conflict
 * naming the exact shortfall and the competing events.
 */
export function detectAssetConflicts(
  reservations: Reservation[],
  assetTypes: AssetType[],
): AssetConflict[] {
  const out: AssetConflict[] = [];

  for (const at of assetTypes) {
    const available = at.totalStock - at.maintenanceReserve;
    const demands = reservations
      .map((r) => {
        const need = r.assets.find((a) => a.assetTypeId === at.id);
        return need
          ? { eventId: r.eventId, qty: need.quantity, w: r.window }
          : null;
      })
      .filter((d): d is { eventId: string; qty: number; w: TimeWindow } => d !== null);

    if (demands.length === 0) continue;

    const boundaries = new Set<string>();
    demands.forEach((d) => {
      boundaries.add(d.w.setupStart);
      boundaries.add(d.w.teardownEnd);
    });
    const ticks = [...boundaries].sort();

    for (let i = 0; i < ticks.length - 1; i++) {
      const t0 = ticks[i];
      const t1 = ticks[i + 1];
      const active = demands.filter(
        (d) => d.w.setupStart <= t0 && d.w.teardownEnd >= t1,
      );
      const total = active.reduce((s, d) => s + d.qty, 0);
      if (total > available) {
        out.push({
          kind: 'asset',
          severity: 'blocker',
          assetTypeId: at.id,
          shortfall: total - available,
          window: { start: t0, end: t1 },
          events: active.map((d) => d.eventId),
          message: `${at.label}: ${total} reserved but only ${available} available — short ${total - available}.`,
        });
      }
    }
  }

  // collapse consecutive identical-shortfall windows per asset type
  return mergeAssetConflicts(out);
}

function mergeAssetConflicts(items: AssetConflict[]): AssetConflict[] {
  const merged: AssetConflict[] = [];
  for (const c of items) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.assetTypeId === c.assetTypeId &&
      prev.shortfall === c.shortfall &&
      prev.window.end === c.window.start &&
      sameEvents(prev.events, c.events)
    ) {
      prev.window.end = c.window.end;
    } else {
      merged.push({ ...c, events: [...c.events] });
    }
  }
  return merged;
}

function sameEvents(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export function detectConflicts(
  reservations: Reservation[],
  spaces: Space[],
  assetTypes: AssetType[],
): Conflict[] {
  return [
    ...detectSpaceConflicts(reservations, spaces),
    ...detectAssetConflicts(reservations, assetTypes),
  ];
}
