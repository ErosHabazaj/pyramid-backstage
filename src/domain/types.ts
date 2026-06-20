// ── Core domain model ────────────────────────────────────────────────
// The "space object" is the heart of the app: one record per room that
// doubles as (1) map geometry, (2) a bookable venue, and (3) the source
// of capacity. Define a room once; everything downstream stays in sync.

export type FloorId = -1 | 0;

export type SpaceType =
  | 'main-hall'
  | 'wedge-room'
  | 'atrium'
  | 'entrance'
  | 'corridor'
  | 'storage'
  | 'technical';

export type SetupStyle =
  | 'theater'
  | 'banquet'
  | 'classroom'
  | 'cabaret'
  | 'standing';

/** A point in floor-plan coordinates (0..100 per axis, y-down). */
export interface Point {
  x: number;
  y: number;
}

export interface Space {
  id: string;
  name: string;
  floor: FloorId;
  type: SpaceType;
  /** Usable floor area in m². Drives all capacity math. */
  areaM2: number;
  /** Outline polygon in plan coordinates. Traced from the venue sketch. */
  footprint: Point[];
  /** Where to drop labels / asset markers. Defaults to polygon centroid. */
  anchor?: Point;
  features: string[]; // 'stage' | 'av-rig' | 'step-free' | 'natural-light' | 'power'
  /** ids of adjacent spaces — used for noise / spillover conflicts. */
  adjacency: string[];
  /** id of nearest storage space, for transport-aware allocation. */
  nearestStorageId?: string;
  bookable: boolean;
  /** Brand fill + ink for halls; undefined spaces fall back to neutral. */
  color?: { fill: string; ink: string };
  /** Marks geometry that is placeholder until the real sketch is traced. */
  placeholder?: boolean;
}

export type AssetCategory =
  | 'chair'
  | 'table-round'
  | 'table-rect'
  | 'mic-handheld'
  | 'mic-lav'
  | 'projector'
  | 'screen'
  | 'speaker'
  | 'lectern'
  | 'riser';

export interface AssetType {
  id: string;
  category: AssetCategory;
  label: string;
  totalStock: number;
  /** Units held back from allocation (maintenance + last-minute buffer). */
  maintenanceReserve: number;
}

export type AssetUnitStatus =
  | 'available'
  | 'reserved'
  | 'in-transit'
  | 'deployed'
  | 'returned';

/** A taggable batch carrying a QR code — the hero of the asset tracking story. */
export interface AssetUnit {
  id: string;
  assetTypeId: string;
  qrCode: string;
  quantity: number;
  locationSpaceId: string;
  status: AssetUnitStatus;
  reservedForEventId?: string;
}

export type EventStatus =
  | 'inquiry'
  | 'matched'
  | 'quoted'
  | 'confirmed'
  | 'in-prep'
  | 'live'
  | 'done'
  | 'cancelled';

export interface TimeWindow {
  setupStart: string; // ISO 8601
  start: string;
  end: string;
  teardownEnd: string;
}

export interface AssetRequirement {
  assetTypeId: string;
  quantity: number;
}

export interface EventRequest {
  id: string;
  title: string;
  organizer: string;
  headcount: number;
  setupStyle: SetupStyle;
  window: TimeWindow;
  spaceId?: string;
  status: EventStatus;
  assetReqs: AssetRequirement[];
  notes?: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  eventId: string;
  spaceId: string;
  window: TimeWindow;
  assets: AssetRequirement[];
}

export type TaskTeam = 'av' | 'logistics' | 'cleaning' | 'front-desk';
export type TaskPhase = 'setup' | 'teardown';

export interface OpsTask {
  id: string;
  eventId: string;
  phase: TaskPhase;
  team: TaskTeam;
  title: string;
  /** Minutes relative to event start (negative = before the event). */
  dueOffsetMin: number;
  done: boolean;
  dependsOn?: string[];
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
  eventId?: string;
}
