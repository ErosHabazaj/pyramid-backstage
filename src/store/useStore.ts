import { create } from 'zustand';
import type {
  AssetRequirement,
  AssetType,
  AssetUnit,
  AuditEntry,
  EventRequest,
  OpsTask,
  Reservation,
  SetupStyle,
  Space,
  TimeWindow,
} from '@/domain/types';
import { persistUnit } from '@/lib/assetUnitsRepo';
import { deriveTasks } from '@/domain/planning';
import type { ResolutionPlan } from '@/domain/resolutions';

export type RealtimeStatus = 'off' | 'connecting' | 'on';

export interface NewEventDraft {
  title: string;
  organizer: string;
  headcount: number;
  setupStyle: SetupStyle;
  spaceId: string;
  window: TimeWindow;
  assetReqs: AssetRequirement[];
}
import {
  SEED_ASSET_TYPES,
  SEED_ASSET_UNITS,
  SEED_AUDIT,
  SEED_EVENTS,
  SEED_RESERVATIONS,
  SEED_SPACES,
  SEED_TASKS,
} from '@/data/seed';

interface AppState {
  spaces: Space[];
  assetTypes: AssetType[];
  assetUnits: AssetUnit[];
  events: EventRequest[];
  reservations: Reservation[];
  tasks: OpsTask[];
  audit: AuditEntry[];

  selectedSpaceId: string | null;
  scrubHour: number;
  realtimeStatus: RealtimeStatus;

  selectSpace: (id: string | null) => void;
  setScrubHour: (h: number) => void;
  /** Simulates a QR scan re-locating a cart — the live-map hero action. */
  deployUnit: (unitId: string, toSpaceId: string) => void;
  /** Generic move: relocate a cart and set its status (deploy / return / transit). */
  moveUnit: (unitId: string, toSpaceId: string, status: AssetUnit['status']) => void;

  /** Confirm a proposal → create event + reservation + tasks + audit. Returns new id. */
  createEvent: (draft: NewEventDraft) => string;
  /** Execute a one-click conflict resolution; the engine re-runs automatically. */
  applyResolution: (plan: ResolutionPlan) => void;

  // realtime sync
  setRealtimeStatus: (status: RealtimeStatus) => void;
  setAssetUnits: (units: AssetUnit[]) => void;
  /** Apply an inbound realtime change (upsert by id). */
  applyUnitChange: (unit: AssetUnit) => void;
}

export const useStore = create<AppState>((set, get) => ({
  spaces: SEED_SPACES,
  assetTypes: SEED_ASSET_TYPES,
  assetUnits: SEED_ASSET_UNITS,
  events: SEED_EVENTS,
  reservations: SEED_RESERVATIONS,
  tasks: SEED_TASKS,
  audit: SEED_AUDIT,

  selectedSpaceId: 's0-space-21',
  scrubHour: 14.5,
  realtimeStatus: 'off',

  selectSpace: (id) => set({ selectedSpaceId: id }),
  setScrubHour: (h) => set({ scrubHour: h }),
  deployUnit: (unitId, toSpaceId) => set((state) => relocate(state, unitId, toSpaceId, 'deployed')),
  moveUnit: (unitId, toSpaceId, status) => set((state) => relocate(state, unitId, toSpaceId, status)),

  createEvent: (draft) => {
    const id = `e-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const space = get().spaces.find((s) => s.id === draft.spaceId);
    const entrance = get().spaces.find((s) => s.type === 'entrance')?.name;

    const event: EventRequest = {
      id,
      title: draft.title,
      organizer: draft.organizer,
      headcount: draft.headcount,
      setupStyle: draft.setupStyle,
      window: draft.window,
      spaceId: draft.spaceId,
      status: 'confirmed',
      assetReqs: draft.assetReqs,
      createdAt,
    };
    const reservation: Reservation = {
      id: `r-${id}`,
      eventId: id,
      spaceId: draft.spaceId,
      window: draft.window,
      assets: draft.assetReqs,
    };
    const tasks = space ? deriveTasks(id, space, draft.setupStyle, draft.headcount, entrance) : [];
    const audit: AuditEntry[] = [
      { id: `${id}-a1`, at: createdAt, actor: 'Intake', action: 'request.created', detail: `${draft.title} — ${draft.headcount} pax`, eventId: id },
      { id: `${id}-a2`, at: createdAt, actor: 'system', action: 'space.matched', detail: `Matched ${space?.name ?? draft.spaceId}`, eventId: id },
      { id: `${id}-a3`, at: createdAt, actor: 'Intake', action: 'event.confirmed', detail: 'Proposal approved → assets reserved', eventId: id },
    ];

    set((state) => ({
      events: [...state.events, event],
      reservations: [...state.reservations, reservation],
      tasks: [...state.tasks, ...tasks],
      audit: [...state.audit, ...audit],
      selectedSpaceId: draft.spaceId,
    }));
    return id;
  },

  applyResolution: (plan) =>
    set((state) => {
      const eid = 'eventId' in plan ? plan.eventId : undefined;
      const audit: AuditEntry = {
        id: `res-${Date.now()}`,
        at: new Date().toISOString(),
        actor: 'Ops',
        action: 'conflict.resolved',
        detail: plan.label,
        eventId: eid,
      };
      const withAudit = [...state.audit, audit];

      switch (plan.kind) {
        case 'reduce-asset':
          return {
            events: state.events.map((e) =>
              e.id === plan.eventId
                ? { ...e, assetReqs: setQty(e.assetReqs, plan.assetTypeId, plan.toQty) }
                : e,
            ),
            reservations: state.reservations.map((r) =>
              r.eventId === plan.eventId
                ? { ...r, assets: setQty(r.assets, plan.assetTypeId, plan.toQty) }
                : r,
            ),
            audit: withAudit,
          };
        case 'external-rental':
          return {
            assetTypes: state.assetTypes.map((at) =>
              at.id === plan.assetTypeId ? { ...at, totalStock: at.totalStock + plan.quantity } : at,
            ),
            audit: withAudit,
          };
        case 'shift-event':
          return {
            events: state.events.map((e) =>
              e.id === plan.eventId ? { ...e, window: shiftWindow(e.window, plan.byHours) } : e,
            ),
            reservations: state.reservations.map((r) =>
              r.eventId === plan.eventId ? { ...r, window: shiftWindow(r.window, plan.byHours) } : r,
            ),
            audit: withAudit,
          };
        case 'reassign-space':
          return {
            events: state.events.map((e) =>
              e.id === plan.eventId ? { ...e, spaceId: plan.toSpaceId } : e,
            ),
            reservations: state.reservations.map((r) =>
              r.eventId === plan.eventId ? { ...r, spaceId: plan.toSpaceId } : r,
            ),
            selectedSpaceId: plan.toSpaceId,
            audit: withAudit,
          };
      }
    }),

  setRealtimeStatus: (realtimeStatus) => set({ realtimeStatus }),
  setAssetUnits: (assetUnits) => set({ assetUnits }),
  applyUnitChange: (unit) =>
    set((state) => ({
      assetUnits: state.assetUnits.some((u) => u.id === unit.id)
        ? state.assetUnits.map((u) => (u.id === unit.id ? unit : u))
        : [...state.assetUnits, unit],
    })),
}));

// Optimistic local relocation + best-effort persistence (realtime echoes
// it back to every device; persistUnit no-ops when Supabase is off).
function relocate(
  state: AppState,
  unitId: string,
  toSpaceId: string,
  status: AssetUnit['status'],
): Partial<AppState> {
  const assetUnits = state.assetUnits.map((u) =>
    u.id === unitId ? { ...u, locationSpaceId: toSpaceId, status } : u,
  );
  const changed = assetUnits.find((u) => u.id === unitId);
  if (changed) void persistUnit(changed).catch(() => {});
  return { assetUnits };
}

function setQty(reqs: AssetRequirement[], assetTypeId: string, qty: number): AssetRequirement[] {
  return reqs
    .map((a) => (a.assetTypeId === assetTypeId ? { ...a, quantity: qty } : a))
    .filter((a) => a.quantity > 0);
}

function shiftIso(iso: string, byHours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + byHours);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function shiftWindow(w: TimeWindow, byHours: number): TimeWindow {
  return {
    setupStart: shiftIso(w.setupStart, byHours),
    start: shiftIso(w.start, byHours),
    end: shiftIso(w.end, byHours),
    teardownEnd: shiftIso(w.teardownEnd, byHours),
  };
}
