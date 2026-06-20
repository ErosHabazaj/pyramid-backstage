import type { EventRequest, Space } from './types';
import type { Conflict } from './conflicts';

// ── Space status at a given hour ─────────────────────────────────────
// Drives the live coloring on the digital twin as you scrub the day.

export type SpaceStatus = 'free' | 'setup' | 'live' | 'teardown' | 'conflict';

const STATUS_COLOR: Record<SpaceStatus, string> = {
  free: '#9a9a93',
  setup: '#ba7517',
  live: '#1d9e75',
  teardown: '#888780',
  conflict: '#e24b4a',
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
    if (e.spaceId !== space.id) continue;
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
        const sp = events.find((e) => e.id === eid)?.spaceId;
        if (sp) ids.add(sp);
      }
    }
  }
  return ids;
}
