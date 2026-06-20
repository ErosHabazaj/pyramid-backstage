import type { Point } from './types';

// ── Plan-coordinate geometry helpers ─────────────────────────────────
// Until the real venue sketch is traced, we generate the Pyramid's
// octagonal footprint procedurally so the map renders end-to-end. Every
// footprint lives in a 0..100 plan space (y-down); the isometric
// projection happens later in the map layer.

export const PLAN_CENTER: Point = { x: 50, y: 50 };

/** Regular octagon (flat top), centered, given a radius in plan units. */
export function octagon(radius: number, center: Point = PLAN_CENTER): Point[] {
  const pts: Point[] = [];
  for (let k = 0; k < 8; k++) {
    const a = ((22.5 + k * 45) * Math.PI) / 180;
    pts.push({
      x: round(center.x + radius * Math.cos(a)),
      y: round(center.y + radius * Math.sin(a)),
    });
  }
  return pts;
}

/**
 * One of four quadrant wedges of the octagon (center + 3 perimeter points).
 * quadrant: 0 = right, 1 = bottom, 2 = left, 3 = top.
 */
export function quadrant(
  radius: number,
  quadrant: 0 | 1 | 2 | 3,
  center: Point = PLAN_CENTER,
): Point[] {
  const o = octagon(radius, center);
  // perimeter index ranges per quadrant (octagon points start at 22.5°)
  const groups: Record<number, number[]> = {
    0: [7, 0, 1], // right
    1: [1, 2, 3], // bottom
    2: [3, 4, 5], // left
    3: [5, 6, 7], // top
  };
  return [center, ...groups[quadrant].map((i) => o[i])];
}

/** Polar point in plan space (degrees, y-down: 0°=right, 90°=down, 270°=top). */
export function polar(angleDeg: number, radius: number, center: Point = PLAN_CENTER): Point {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: round(center.x + radius * Math.cos(a)),
    y: round(center.y + radius * Math.sin(a)),
  };
}

/** Annular sector (curved room) between two radii and two angles. */
export function ringSector(
  a0: number,
  a1: number,
  rInner: number,
  rOuter: number,
  center: Point = PLAN_CENTER,
  steps = 6,
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(polar(a0 + ((a1 - a0) * i) / steps, rOuter, center));
  }
  for (let i = steps; i >= 0; i--) {
    pts.push(polar(a0 + ((a1 - a0) * i) / steps, rInner, center));
  }
  return pts;
}

/** Closed circle approximated as a polygon — the circular building plate. */
export function circlePoly(radius: number, center: Point = PLAN_CENTER, steps = 48): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < steps; i++) {
    pts.push(polar((360 * i) / steps, radius, center));
  }
  return pts;
}

export function centroid(poly: Point[]): Point {
  const n = poly.length;
  let x = 0;
  let y = 0;
  for (const p of poly) {
    x += p.x;
    y += p.y;
  }
  return { x: round(x / n), y: round(y / n) };
}

export function polygonArea(poly: Point[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
