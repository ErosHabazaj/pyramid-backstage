import type { SetupStyle, Space } from './types';

// ── Capacity-from-area engine ────────────────────────────────────────
// Give a room its usable m² and we derive how many people fit in every
// setup style, using standard event-planning densities. This answers the
// brief's "is the requested setup feasible?" with zero manual entry.

/** Gross usable m² required per person, per setup style. */
export const DENSITY_M2: Record<SetupStyle, number> = {
  standing: 0.6,
  theater: 1.0,
  banquet: 1.5, // round tables
  cabaret: 1.8,
  classroom: 1.8,
};

/** Fraction of area usable for people after aisles, stage and circulation. */
export const EFFICIENCY = 0.7;

export const SETUP_LABEL: Record<SetupStyle, string> = {
  theater: 'Theater',
  banquet: 'Banquet (rounds)',
  classroom: 'Classroom',
  cabaret: 'Cabaret',
  standing: 'Standing',
};

export function capacityFor(areaM2: number, style: SetupStyle): number {
  return Math.floor((areaM2 * EFFICIENCY) / DENSITY_M2[style]);
}

export function capacities(space: Space): Record<SetupStyle, number> {
  return {
    theater: capacityFor(space.areaM2, 'theater'),
    banquet: capacityFor(space.areaM2, 'banquet'),
    classroom: capacityFor(space.areaM2, 'classroom'),
    cabaret: capacityFor(space.areaM2, 'cabaret'),
    standing: capacityFor(space.areaM2, 'standing'),
  };
}

export function fitsSetup(
  space: Space,
  headcount: number,
  style: SetupStyle,
): boolean {
  return capacityFor(space.areaM2, style) >= headcount;
}

/**
 * A room is a "Box area" (small enclosed breakout) vs a "Space area" (open
 * hall/pod), classified by its label: "Box 14" is a Box area, "Space 21" a
 * Space area. The venue's floor-plan labels are the source of truth here.
 */
export function isBoxArea(space: Space): boolean {
  return space.name.trim().toLowerCase().startsWith('box');
}

/**
 * Seated-dining setups are steered to Space areas, not Box rooms (a dinner
 * wants an open hall, not a cramped breakout box).
 */
export function isDiningSetup(style: SetupStyle): boolean {
  return style === 'banquet';
}

export interface SpaceMatch {
  space: Space;
  capacity: number;
  /** How tight the fit is: 1 = exactly full, lower = roomier. */
  utilization: number;
  fits: boolean;
  /** True for the small perimeter "Box" rooms (see isBoxArea). */
  isBox: boolean;
}

/**
 * Rank bookable spaces for a request. Best match = fits with the least
 * wasted space (avoids putting a 20-person workshop in the 600-seat hall).
 * For dining setups, Space areas are floated above Box areas so the
 * recommended rooms steer the planner toward open halls.
 */
export function matchSpaces(
  spaces: Space[],
  headcount: number,
  style: SetupStyle,
): SpaceMatch[] {
  const dining = isDiningSetup(style);
  return spaces
    .filter((s) => s.bookable && s.type !== 'storage' && s.type !== 'technical')
    .map((space) => {
      const capacity = capacityFor(space.areaM2, style);
      return {
        space,
        capacity,
        utilization: capacity > 0 ? headcount / capacity : Infinity,
        fits: capacity >= headcount,
        isBox: isBoxArea(space),
      };
    })
    .sort((a, b) => {
      if (a.fits !== b.fits) return a.fits ? -1 : 1;
      // for dinners, surface Space areas ahead of Box areas
      if (dining && a.isBox !== b.isBox) return a.isBox ? 1 : -1;
      // fitting rooms: prefer the snuggest (least wasted space).
      // non-fitting rooms: prefer the largest — the best base to combine.
      return a.fits ? b.utilization - a.utilization : b.capacity - a.capacity;
    });
}
