import type { EventRequest, Space } from './types';
import type { Conflict } from './conflicts';

/** All rooms an event occupies (multi-space aware, primary-only fallback). */
export function eventSpaceIds(e: EventRequest): string[] {
  if (e.spaceIds?.length) return e.spaceIds;
  return e.spaceId ? [e.spaceId] : [];
}

// ── Space status at a given hour ─────────────────────────────────────
// Drives the live coloring on the digital twin as you scrub the day.

export type SpaceStatus = 'free' | 'setup' | 'live' | 'teardown' | 'conflict';

const STATUS_COLOR: Record<SpaceStatus, string> = {
  free: '#bcb4a4',
  setup: '#e8531e', // orange
  live: '#9caf2c', // olive
  teardown: '#9a9082',
  conflict: '#c81e1e',
};

export const STATUS_LABEL: Record<SpaceStatus, string> = {
  free: 'Free',
  setup: 'Setup',
  live: 'Live',
  teardown: 'Teardown',
  conflict: 'Conflict',
};

export function statusColor(s: SpaceStatus): string {
  return STATUS_COLOR[s];
}

function hourFrac(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

export function spaceStatusAt(
  space: Space,
  events: EventRequest[],
  hour: number,
  conflictSpaceIds: Set<string>,
): SpaceStatus {
  if (conflictSpaceIds.has(space.id)) return 'conflict';
  for (const e of events) {
    if (!eventSpaceIds(e).includes(space.id)) continue;
    const ss = hourFrac(e.window.setupStart);
    const s = hourFrac(e.window.start);
    const en = hourFrac(e.window.end);
    const te = hourFrac(e.window.teardownEnd);
    if (hour >= s && hour <= en) return 'live';
    if (hour >= ss && hour < s) return 'setup';
    if (hour > en && hour <= te) return 'teardown';
  }
  return 'free';
}

/** Spaces touched by any conflict (direct space clash or an event's asset clash). */
export function conflictSpaceIds(
  conflicts: Conflict[],
  events: EventRequest[],
): Set<string> {
  const ids = new Set<string>();
  for (const c of conflicts) {
    if (c.kind === 'space' || c.kind === 'spillover') {
      ids.add(c.spaceId);
    } else {
      for (const eid of c.events) {
        const ev = events.find((e) => e.id === eid);
        if (ev) eventSpaceIds(ev).forEach((sp) => ids.add(sp));
      }
    }
  }
  return ids;
}
