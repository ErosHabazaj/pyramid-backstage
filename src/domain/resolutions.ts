import type { Conflict } from './conflicts';
import { windowsOverlap } from './conflicts';
import { capacityFor } from './capacity';
import type {
  AssetType,
  EventRequest,
  EventStatus,
  Reservation,
  Space,
} from './types';

// ── Conflict resolution planner ──────────────────────────────────────
// Each conflict yields one-click ResolutionPlans. These are pure data;
// the store executes them, then the engine re-runs and the conflict
// clears (or doesn't). Never touches a 'live' event if another is movable.

export type ResolutionPlan =
  | { kind: 'reduce-asset'; eventId: string; assetTypeId: string; toQty: number; label: string; detail: string }
  | { kind: 'external-rental'; assetTypeId: string; quantity: number; label: string; detail: string }
  | { kind: 'shift-event'; eventId: string; byHours: number; label: string; detail: string }
  | { kind: 'reassign-space'; eventId: string; toSpaceId: string; label: string; detail: string };

export interface ResolutionContext {
  events: EventRequest[];
  reservations: Reservation[];
  spaces: Space[];
  assetTypes: AssetType[];
}

const MOVABILITY: Record<EventStatus, number> = {
  inquiry: 0,
  quoted: 1,
  matched: 2,
  confirmed: 3,
  'in-prep': 4,
  live: 5,
  done: 6,
  cancelled: 0,
};

const hourFrac = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
};

/** Of the events in a conflict, the most movable one (never 'live' if avoidable). */
function pickTarget(eventIds: string[], events: EventRequest[]): EventRequest | null {
  const list = eventIds
    .map((id) => events.find((e) => e.id === id))
    .filter((e): e is EventRequest => !!e)
    .sort((a, b) => MOVABILITY[a.status] - MOVABILITY[b.status]);
  return list[0] ?? null;
}

export function resolutionsFor(conflict: Conflict, ctx: ResolutionContext): ResolutionPlan[] {
  if (conflict.kind === 'asset') return assetResolutions(conflict, ctx);
  if (conflict.kind === 'space') return spaceResolutions(conflict, ctx);
  return [];
}

function assetResolutions(
  conflict: Extract<Conflict, { kind: 'asset' }>,
  ctx: ResolutionContext,
): ResolutionPlan[] {
  const { events, reservations, assetTypes } = ctx;
  const at = assetTypes.find((t) => t.id === conflict.assetTypeId);
  const label = at?.label ?? conflict.assetTypeId;
  const target = pickTarget(conflict.events, events);
  const plans: ResolutionPlan[] = [];

  if (target) {
    const res = reservations.find((r) => r.eventId === target.id);
    const q = res?.assets.find((a) => a.assetTypeId === conflict.assetTypeId)?.quantity ?? 0;
    const toQty = Math.max(0, q - conflict.shortfall);
    if (q > 0 && toQty < q) {
      plans.push({
        kind: 'reduce-asset',
        eventId: target.id,
        assetTypeId: conflict.assetTypeId,
        toQty,
        label: `Trim ${label} on ${target.title}`,
        detail: `${q} → ${toQty}`,
      });
    }

    // shift the movable event until its window clears the others
    const others = conflict.events
      .filter((id) => id !== target.id)
      .map((id) => events.find((e) => e.id === id))
      .filter((e): e is EventRequest => !!e);
    const targetSetup = hourFrac(target.window.setupStart);
    const latestTeardown = Math.max(...others.map((e) => hourFrac(e.window.teardownEnd)));
    const byHours = Math.ceil(latestTeardown - targetSetup);
    if (byHours > 0 && byHours <= 6) {
      plans.push({
        kind: 'shift-event',
        eventId: target.id,
        byHours,
        label: `Delay ${target.title} by ${byHours}h`,
        detail: 'removes the overlap',
      });
    }
  }

  plans.push({
    kind: 'external-rental',
    assetTypeId: conflict.assetTypeId,
    quantity: conflict.shortfall,
    label: `Rent ${conflict.shortfall} extra ${label.toLowerCase()}`,
    detail: 'external supplier',
  });

  return plans;
}

function spaceResolutions(
  conflict: Extract<Conflict, { kind: 'space' }>,
  ctx: ResolutionContext,
): ResolutionPlan[] {
  const { events, reservations, spaces } = ctx;
  const target = pickTarget(conflict.events, events);
  const plans: ResolutionPlan[] = [];
  if (!target) return plans;

  const targetRes = reservations.find((r) => r.eventId === target.id);
  if (!targetRes) return plans;

  const candidates = spaces
    .filter(
      (s) =>
        s.bookable &&
        s.type !== 'storage' &&
        s.type !== 'technical' &&
        s.id !== targetRes.spaceId &&
        capacityFor(s.areaM2, target.setupStyle) >= target.headcount &&
        !reservations.some(
          (r) => r.eventId !== target.id && r.spaceId === s.id && windowsOverlap(r.window, targetRes.window),
        ),
    )
    .sort((a, b) => a.areaM2 - b.areaM2);

  if (candidates[0]) {
    plans.push({
      kind: 'reassign-space',
      eventId: target.id,
      toSpaceId: candidates[0].id,
      label: `Move ${target.title} to ${candidates[0].name}`,
      detail: `${candidates[0].areaM2} m² · fits ${target.headcount}`,
    });
  }

  // shift to clear the overlap
  const others = conflict.events
    .filter((id) => id !== target.id)
    .map((id) => events.find((e) => e.id === id))
    .filter((e): e is EventRequest => !!e);
  if (others.length) {
    const byHours = Math.ceil(
      Math.max(...others.map((e) => hourFrac(e.window.teardownEnd))) - hourFrac(target.window.setupStart),
    );
    if (byHours > 0 && byHours <= 6) {
      plans.push({
        kind: 'shift-event',
        eventId: target.id,
        byHours,
        label: `Delay ${target.title} by ${byHours}h`,
        detail: 'removes the overlap',
      });
    }
  }

  return plans;
}
