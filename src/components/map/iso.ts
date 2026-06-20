import type { FloorId, Point } from '@/domain/types';

// ── Isometric (2.5D) projection ──────────────────────────────────────
// Plan coordinates (0..100, y-down) → screen coordinates. Floors are
// vertically squashed and offset to read as separated, stacked plates.
// Same room data feeds this today and a future react-three-fiber renderer.

export const SX = 2.2; // horizontal scale
export const SY = 1.1; // vertical scale (≈0.5 squash → the iso look)
export const OX = 45; // x origin offset
export const PLATE_THICKNESS = 10;

export const FLOOR_Y: Record<FloorId, number> = {
  0: 45, // upper plate, higher on screen
  [-1]: 165, // lower plate
};

export const FLOOR_ORDER: FloorId[] = [-1, 0]; // draw lower first

export function project(p: Point, floor: FloorId): Point {
  return { x: p.x * SX + OX, y: p.y * SY + FLOOR_Y[floor] };
}

export function projectPoly(poly: Point[], floor: FloorId): string {
  return poly
    .map((p) => {
      const q = project(p, floor);
      return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    })
    .join(' ');
}

export const VIEWBOX = '0 0 320 300';
