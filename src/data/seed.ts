import type {
  AssetType,
  AssetUnit,
  AuditEntry,
  EventRequest,
  OpsTask,
  Reservation,
  Space,
} from '@/domain/types';
import { centroid } from '@/domain/geometry';

// ── Seed data — Pyramid plan (ids match the 3D model node names) ───────
// Floor 0 holds only the central "Plug n Play" box; floor -1 holds the
// main hall, two side halls, the perimeter boxes, and the store. Room ids
// match the GLB node names (floor-1space1, floor0box1.4, …) so the 3D twin
// maps 1:1. Real geometry lives in the model; footprints here are
// placeholders (the 3D scene is the map, not these polygons).

function space(s: Omit<Space, 'anchor'> & { anchor?: Space['anchor'] }): Space {
  return { ...s, anchor: s.anchor ?? centroid(s.footprint) };
}

// Placeholder rectangle footprint (laid out in a row; not rendered).
const rect = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

export const SEED_SPACES: Space[] = [
  space({ id: 'floor-1space1', name: 'Main hall', floor: -1, type: 'main-hall', areaM2: 206, footprint: rect(0, 0, 30, 14), features: ['stage', 'av-rig', 'step-free', 'natural-light'], adjacency: [], nearestStorageId: 'store', note: 'Largest hall — built-in stage and full AV rig. Best for keynotes and galas.', bookable: true }),
  space({ id: 'floor-1space4', name: 'Side hall 4', floor: -1, type: 'main-hall', areaM2: 190, footprint: rect(34, 0, 20, 18), features: ['step-free'], adjacency: [], nearestStorageId: 'store', bookable: true }),
  space({ id: 'floor-1space14', name: 'Side hall 14', floor: -1, type: 'main-hall', areaM2: 190, footprint: rect(58, 0, 20, 18), features: ['step-free'], adjacency: [], nearestStorageId: 'store', bookable: true }),
  space({ id: 'floor-1box1.1', name: 'Box 1.1', floor: -1, type: 'wedge-room', areaM2: 33, footprint: rect(0, 22, 7, 5), features: [], adjacency: [], nearestStorageId: 'store', bookable: true }),
  space({ id: 'floor-1box1.2', name: 'Box 1.2', floor: -1, type: 'wedge-room', areaM2: 72, footprint: rect(10, 22, 7, 11), features: [], adjacency: [], nearestStorageId: 'store', bookable: true }),
  space({ id: 'floor-1box1.3', name: 'Box 1.3', floor: -1, type: 'wedge-room', areaM2: 98, footprint: rect(20, 22, 14, 7), features: [], adjacency: [], nearestStorageId: 'store', bookable: true }),
  space({ id: 'floor-1box1', name: 'Box 1', floor: -1, type: 'wedge-room', areaM2: 90, footprint: rect(38, 22, 15, 6), features: [], adjacency: [], nearestStorageId: 'store', bookable: true }),
  space({ id: 'floor0box1.4', name: 'Plug n Play', floor: 0, type: 'wedge-room', areaM2: 33, footprint: rect(20, 40, 7, 5), features: ['power'], adjacency: [], nearestStorageId: 'store', note: 'Central plug-and-play box on floor 0.', bookable: true }),
  space({ id: 'store', name: 'Store', floor: -1, type: 'storage', areaM2: 50, footprint: rect(60, 40, 8, 6), features: ['power'], adjacency: [], bookable: false }),
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
    let locationSpaceId = 'store';
    let status: AssetUnit['status'] = 'available';
    let reservedForEventId: string | undefined;
    if (i <= 3) {
      locationSpaceId = 'floor-1space1';
      status = 'deployed';
      reservedForEventId = 'e1';
    } else if (i === 4) {
      locationSpaceId = 'floor-1space4';
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
    { id: 'u-tbl-01', assetTypeId: 'table-round', qrCode: 'PB-TBL-01', quantity: 12, locationSpaceId: 'store', status: 'available' },
    { id: 'u-tbl-02', assetTypeId: 'table-round', qrCode: 'PB-TBL-02', quantity: 12, locationSpaceId: 'floor-1space4', status: 'deployed', reservedForEventId: 'e2' },
    { id: 'u-mic-01', assetTypeId: 'mic-handheld', qrCode: 'PB-MIC-01', quantity: 8, locationSpaceId: 'store', status: 'available' },
    { id: 'u-mic-02', assetTypeId: 'mic-lav', qrCode: 'PB-LAV-01', quantity: 6, locationSpaceId: 'floor-1space1', status: 'deployed', reservedForEventId: 'e1' },
    { id: 'u-proj-01', assetTypeId: 'projector', qrCode: 'PB-PRJ-01', quantity: 4, locationSpaceId: 'store', status: 'available' },
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
    spaceId: 'floor-1space1',
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
    spaceId: 'floor-1space4',
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
  // A pending proposal awaiting manager review (no reservation until approved).
  {
    id: 'e3',
    title: 'TEDxTirana Salon',
    organizer: 'TEDx Volunteers',
    headcount: 70,
    setupStyle: 'theater',
    window: {
      setupStart: '2026-06-27T16:00:00',
      start: '2026-06-27T18:00:00',
      end: '2026-06-27T21:00:00',
      teardownEnd: '2026-06-27T22:00:00',
    },
    spaceId: 'floor-1box1.3',
    spaceIds: ['floor-1box1.3'],
    status: 'inquiry',
    assetReqs: [
      { assetTypeId: 'chair', quantity: 70 },
      { assetTypeId: 'mic-handheld', quantity: 2 },
      { assetTypeId: 'mic-lav', quantity: 2 },
      { assetTypeId: 'projector', quantity: 1 },
      { assetTypeId: 'screen', quantity: 1 },
      { assetTypeId: 'speaker', quantity: 2 },
      { assetTypeId: 'lectern', quantity: 1 },
    ],
    createdAt: t(10),
    organizerId: 'u-organizer',
    thread: [
      {
        id: 'e3-m1',
        at: t(10),
        fromRole: 'organizer',
        fromName: 'TEDx Volunteers',
        body: 'Evening salon with 6 speakers. We’d love the central hall if it’s free that night.',
      },
    ],
    attendees: [],
  },
];

// e1 + e2 overlap 14:00–19:00 and together need 13 lavalier mics vs 11
// available → the engine flags the over-allocation.
// Only confirmed events hold reservations; pending proposals reserve nothing
// until a manager approves them.
export const SEED_RESERVATIONS: Reservation[] = SEED_EVENTS.filter(
  (e) => e.status !== 'inquiry' && e.status !== 'cancelled',
).map((e) => ({
  id: `r-${e.id}`,
  eventId: e.id,
  spaceId: e.spaceId as string,
  window: e.window,
  assets: e.assetReqs,
}));

export const SEED_TASKS: OpsTask[] = [
  { id: 'tk1', eventId: 'e1', phase: 'setup', team: 'logistics', title: 'Lay 120 theater chairs in Main hall', dueOffsetMin: -120, done: true },
  { id: 'tk2', eventId: 'e1', phase: 'setup', team: 'av', title: 'Rig PA, projector + screen', dueOffsetMin: -150, done: true },
  { id: 'tk3', eventId: 'e1', phase: 'setup', team: 'av', title: 'Sound-check 12 mics', dueOffsetMin: -60, done: false, dependsOn: ['tk2'] },
  { id: 'tk4', eventId: 'e1', phase: 'setup', team: 'front-desk', title: 'Registration desk at the entrance', dueOffsetMin: -90, done: false },
  { id: 'tk5', eventId: 'e1', phase: 'teardown', team: 'logistics', title: 'Stack + return chairs to Store', dueOffsetMin: 60, done: false },
  { id: 'tk6', eventId: 'e1', phase: 'teardown', team: 'cleaning', title: 'Clear and reset Main hall', dueOffsetMin: 90, done: false, dependsOn: ['tk5'] },
];

export const SEED_AUDIT: AuditEntry[] = [
  { id: 'a1', at: t(8), actor: 'Ana (ops)', action: 'request.created', detail: 'Albania Tech Summit — 120 pax', eventId: 'e1' },
  { id: 'a2', at: t(8, 20), actor: 'system', action: 'space.matched', detail: 'Matched Space 21 (theater fits 126)', eventId: 'e1' },
  { id: 'a3', at: t(8, 45), actor: 'Besnik (mgr)', action: 'event.confirmed', detail: 'Quote €4,200 approved', eventId: 'e1' },
  { id: 'a4', at: t(9, 30), actor: 'Ana (ops)', action: 'event.confirmed', detail: 'Adriatic Design Awards confirmed', eventId: 'e2' },
];
