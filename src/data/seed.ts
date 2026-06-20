import type {
  AssetType,
  AssetUnit,
  AuditEntry,
  EventRequest,
  OpsTask,
  Reservation,
  Space,
} from '@/domain/types';
import { centroid, ringSector } from '@/domain/geometry';

// ── Seed data — Floor 0 (from the venue sketch) ───────────────────────
// Circular floor: a ring of perimeter breakout rooms (the "Box" rooms), a
// large hall (Space 21) on the left, a central hall (Box 14), and two
// external pods (Space 23 top, Space 30 bottom). Areas are calibrated to
// the anchor "Space 21 holds ~125 seated"; refine once we have dimensions.
// Floor -1 is not mapped yet.

const HALL = {
  blue: { fill: '#e6f1fb', ink: '#0c447c' },
  orange: { fill: '#f5c4b3', ink: '#4a1b0c' },
};

function space(s: Omit<Space, 'anchor'> & { anchor?: Space['anchor'] }): Space {
  return { ...s, anchor: s.anchor ?? centroid(s.footprint) };
}

// perimeter ring room: annular sector between r30 and r44
const ring = (a0: number, a1: number, rOuter = 44) => ringSector(a0, a1, 30, rOuter);

export const SEED_SPACES: Space[] = [
  // ── Large hall (left sector) — anchor: ~125 seated ──
  space({
    id: 's0-space-21',
    name: 'Space 21',
    floor: 0,
    type: 'main-hall',
    areaM2: 180,
    footprint: ringSector(150, 210, 26, 44),
    features: ['stage', 'av-rig', 'step-free', 'natural-light'],
    adjacency: ['s0-box-2', 's0-box-9'],
    nearestStorageId: 's0-box-9',
    bookable: true,
    color: HALL.blue,
    placeholder: true,
  }),

  // ── Central hall ──
  space({
    id: 's0-box-14',
    name: 'Box 14',
    floor: 0,
    type: 'main-hall',
    areaM2: 115,
    footprint: [
      { x: 37, y: 40 },
      { x: 58, y: 40 },
      { x: 58, y: 61 },
      { x: 37, y: 61 },
    ],
    features: ['av-rig', 'step-free'],
    adjacency: ['s0-space-21'],
    nearestStorageId: 's0-box-9',
    bookable: true,
    color: HALL.orange,
    placeholder: true,
  }),

  // ── Perimeter ring rooms (small meeting / breakout rooms) ──
  space({ id: 's0-box-2', name: 'Box 2', floor: 0, type: 'wedge-room', areaM2: 32, footprint: ring(217, 247), features: [], adjacency: ['s0-space-21'], nearestStorageId: 's0-box-9', bookable: true, placeholder: true }),
  space({ id: 's0-box-7', name: 'Box 7', floor: 0, type: 'wedge-room', areaM2: 28, footprint: ring(287, 313), features: [], adjacency: [], nearestStorageId: 's0-box-9', bookable: true, placeholder: true }),
  space({ id: 's0-box-4', name: 'Box 4', floor: 0, type: 'wedge-room', areaM2: 28, footprint: ring(317, 343), features: [], adjacency: [], nearestStorageId: 's0-box-9', bookable: true, placeholder: true }),
  space({ id: 's0-box-5', name: 'Box 5', floor: 0, type: 'wedge-room', areaM2: 44, footprint: ring(347, 377, 46), features: ['natural-light'], adjacency: [], nearestStorageId: 's0-box-9', bookable: true, placeholder: true }),
  space({ id: 's0-box-a', name: 'Box ?', floor: 0, type: 'wedge-room', areaM2: 24, footprint: ring(28, 52), features: [], adjacency: [], nearestStorageId: 's0-box-9', bookable: true, placeholder: true }),
  space({ id: 's0-box-8', name: 'Box 8', floor: 0, type: 'wedge-room', areaM2: 26, footprint: ring(58, 84), features: [], adjacency: ['s0-box-9'], nearestStorageId: 's0-box-9', bookable: true, placeholder: true }),
  space({ id: 's0-box-9', name: 'Box 9 · store', floor: 0, type: 'storage', areaM2: 35, footprint: ring(90, 116), features: ['power'], adjacency: ['s0-box-8', 's0-space-21'], bookable: false, placeholder: true }),

  // ── External pods ──
  space({ id: 's0-space-23', name: 'Space 23', floor: 0, type: 'entrance', areaM2: 45, footprint: ringSector(255, 285, 46, 53), features: ['natural-light', 'step-free'], adjacency: ['s0-box-2', 's0-box-7'], nearestStorageId: 's0-box-9', bookable: true, placeholder: true }),
  space({ id: 's0-space-30', name: 'Space 30', floor: 0, type: 'atrium', areaM2: 40, footprint: ringSector(80, 100, 46, 53), features: ['step-free'], adjacency: ['s0-box-8'], nearestStorageId: 's0-box-9', bookable: true, placeholder: true }),
];

export const SEED_ASSET_TYPES: AssetType[] = [
  { id: 'chair', category: 'chair', label: 'Stacking chairs', totalStock: 600, maintenanceReserve: 30 },
  { id: 'table-round', category: 'table-round', label: 'Round tables (8-seat)', totalStock: 60, maintenanceReserve: 3 },
  { id: 'table-rect', category: 'table-rect', label: 'Rectangular tables', totalStock: 40, maintenanceReserve: 2 },
  { id: 'mic-handheld', category: 'mic-handheld', label: 'Handheld mics', totalStock: 24, maintenanceReserve: 2 },
  { id: 'mic-lav', category: 'mic-lav', label: 'Lavalier mics', totalStock: 12, maintenanceReserve: 1 },
  { id: 'projector', category: 'projector', label: 'Projectors', totalStock: 8, maintenanceReserve: 0 },
  { id: 'screen', category: 'screen', label: 'Projection screens', totalStock: 6, maintenanceReserve: 0 },
  { id: 'speaker', category: 'speaker', label: 'PA speakers', totalStock: 16, maintenanceReserve: 1 },
  { id: 'lectern', category: 'lectern', label: 'Lecterns', totalStock: 6, maintenanceReserve: 0 },
  { id: 'riser', category: 'riser', label: 'Stage risers', totalStock: 30, maintenanceReserve: 2 },
];

// Taggable carts carrying QR codes (the asset-tracking hero).
function buildUnits(): AssetUnit[] {
  const units: AssetUnit[] = [];
  for (let i = 1; i <= 12; i++) {
    const id = String(i).padStart(2, '0');
    let locationSpaceId = 's0-box-9';
    let status: AssetUnit['status'] = 'available';
    let reservedForEventId: string | undefined;
    if (i <= 3) {
      locationSpaceId = 's0-space-21';
      status = 'deployed';
      reservedForEventId = 'e1';
    } else if (i === 4) {
      locationSpaceId = 's0-box-14';
      status = 'deployed';
      reservedForEventId = 'e2';
    }
    units.push({
      id: `u-chair-${id}`,
      assetTypeId: 'chair',
      qrCode: `PB-CHR-${id}`,
      quantity: 50,
      locationSpaceId,
      status,
      reservedForEventId,
    });
  }
  units.push(
    { id: 'u-tbl-01', assetTypeId: 'table-round', qrCode: 'PB-TBL-01', quantity: 12, locationSpaceId: 's0-box-9', status: 'available' },
    { id: 'u-tbl-02', assetTypeId: 'table-round', qrCode: 'PB-TBL-02', quantity: 12, locationSpaceId: 's0-box-14', status: 'deployed', reservedForEventId: 'e2' },
    { id: 'u-mic-01', assetTypeId: 'mic-handheld', qrCode: 'PB-MIC-01', quantity: 8, locationSpaceId: 's0-box-9', status: 'available' },
    { id: 'u-mic-02', assetTypeId: 'mic-lav', qrCode: 'PB-LAV-01', quantity: 6, locationSpaceId: 's0-space-21', status: 'deployed', reservedForEventId: 'e1' },
    { id: 'u-proj-01', assetTypeId: 'projector', qrCode: 'PB-PRJ-01', quantity: 4, locationSpaceId: 's0-box-9', status: 'available' },
  );
  return units;
}

export const SEED_ASSET_UNITS: AssetUnit[] = buildUnits();

// ── "Today" = 2026-06-19 ──
const DAY = '2026-06-19';
const t = (h: number, m = 0) =>
  `${DAY}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

export const SEED_EVENTS: EventRequest[] = [
  {
    id: 'e1',
    title: 'Albania Tech Summit',
    organizer: 'TechAlbania',
    headcount: 120,
    setupStyle: 'theater',
    window: { setupStart: t(12), start: t(14), end: t(18), teardownEnd: t(19) },
    spaceId: 's0-space-21',
    status: 'live',
    assetReqs: [
      { assetTypeId: 'chair', quantity: 120 },
      { assetTypeId: 'mic-handheld', quantity: 6 },
      { assetTypeId: 'mic-lav', quantity: 6 },
      { assetTypeId: 'projector', quantity: 1 },
      { assetTypeId: 'screen', quantity: 1 },
      { assetTypeId: 'speaker', quantity: 4 },
      { assetTypeId: 'lectern', quantity: 1 },
      { assetTypeId: 'riser', quantity: 6 },
    ],
    notes: 'Keynote + 3 breakout talks. Livestreamed.',
    createdAt: t(8),
  },
  {
    id: 'e2',
    title: 'Adriatic Design Awards',
    organizer: 'Creative Hub',
    headcount: 100,
    setupStyle: 'standing',
    window: { setupStart: t(14), start: t(15), end: t(21), teardownEnd: t(22) },
    spaceId: 's0-box-14',
    status: 'confirmed',
    assetReqs: [
      { assetTypeId: 'chair', quantity: 30 },
      { assetTypeId: 'table-round', quantity: 12 },
      { assetTypeId: 'mic-handheld', quantity: 8 },
      { assetTypeId: 'mic-lav', quantity: 7 },
      { assetTypeId: 'projector', quantity: 1 },
      { assetTypeId: 'screen', quantity: 1 },
      { assetTypeId: 'speaker', quantity: 4 },
      { assetTypeId: 'lectern', quantity: 1 },
      { assetTypeId: 'riser', quantity: 4 },
    ],
    notes: 'Standing reception with stage presentation.',
    createdAt: t(9),
  },
];

// e1 + e2 overlap 14:00–19:00 and together need 13 lavalier mics vs 11
// available → the engine flags the over-allocation.
export const SEED_RESERVATIONS: Reservation[] = SEED_EVENTS.map((e) => ({
  id: `r-${e.id}`,
  eventId: e.id,
  spaceId: e.spaceId as string,
  window: e.window,
  assets: e.assetReqs,
}));

export const SEED_TASKS: OpsTask[] = [
  { id: 'tk1', eventId: 'e1', phase: 'setup', team: 'logistics', title: 'Lay 120 theater chairs in Space 21', dueOffsetMin: -120, done: true },
  { id: 'tk2', eventId: 'e1', phase: 'setup', team: 'av', title: 'Rig PA, projector + screen', dueOffsetMin: -150, done: true },
  { id: 'tk3', eventId: 'e1', phase: 'setup', team: 'av', title: 'Sound-check 12 mics', dueOffsetMin: -60, done: false, dependsOn: ['tk2'] },
  { id: 'tk4', eventId: 'e1', phase: 'setup', team: 'front-desk', title: 'Registration desk at Space 23', dueOffsetMin: -90, done: false },
  { id: 'tk5', eventId: 'e1', phase: 'teardown', team: 'logistics', title: 'Stack + return chairs to Box 9', dueOffsetMin: 60, done: false },
  { id: 'tk6', eventId: 'e1', phase: 'teardown', team: 'cleaning', title: 'Clear and reset Space 21', dueOffsetMin: 90, done: false, dependsOn: ['tk5'] },
];

export const SEED_AUDIT: AuditEntry[] = [
  { id: 'a1', at: t(8), actor: 'Ana (ops)', action: 'request.created', detail: 'Albania Tech Summit — 120 pax', eventId: 'e1' },
  { id: 'a2', at: t(8, 20), actor: 'system', action: 'space.matched', detail: 'Matched Space 21 (theater fits 126)', eventId: 'e1' },
  { id: 'a3', at: t(8, 45), actor: 'Besnik (mgr)', action: 'event.confirmed', detail: 'Quote €4,200 approved', eventId: 'e1' },
  { id: 'a4', at: t(9, 30), actor: 'Ana (ops)', action: 'event.confirmed', detail: 'Adriatic Design Awards confirmed', eventId: 'e2' },
];
