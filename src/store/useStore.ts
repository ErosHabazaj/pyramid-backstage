import { create } from 'zustand';
import type {
  AssetRequirement,
  AssetType,
  AssetUnit,
  AuditEntry,
  EventMessage,
  EventRequest,
  OpsTask,
  Reservation,
  SetupStyle,
  Space,
  TimeWindow,
  User,
} from '@/domain/types';
import { persistUnit } from '@/lib/assetUnitsRepo';
import { signOut } from '@/lib/auth';
import { deriveTasks } from '@/domain/planning';
import type { ResolutionPlan } from '@/domain/resolutions';

export type RealtimeStatus = 'off' | 'connecting' | 'on';

export interface NewEventDraft {
  title: string;
  organizer: string;
  organizerId: string;
  headcount: number;
  setupStyle: SetupStyle;
  /** One or more rooms; the first is the primary space. */
  spaceIds: string[];
  window: TimeWindow;
  assetReqs: AssetRequirement[];
  /** Optional first message from the organizer to the review team. */
  message?: string;
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

  currentUser: User | null;
  /** False until the Supabase session has been resolved on boot. */
  authReady: boolean;
  selectedSpaceId: string | null;
  scrubHour: number;
  realtimeStatus: RealtimeStatus;

  // auth
  setCurrentUser: (user: User | null) => void;
  setAuthReady: (ready: boolean) => void;
  logout: () => void;

  selectSpace: (id: string | null) => void;
  setScrubHour: (h: number) => void;
  /** Simulates a QR scan re-locating a cart — the live-map hero action. */
  deployUnit: (unitId: string, toSpaceId: string) => void;
  /** Generic move: relocate a cart and set its status (deploy / return / transit). */
  moveUnit: (unitId: string, toSpaceId: string, status: AssetUnit['status']) => void;

  // manager: edit the venue + inventory
  updateSpace: (id: string, patch: Partial<Space>) => void;
  updateAssetType: (id: string, patch: Partial<AssetType>) => void;

  /** Organizer submits a proposal → pending event ('inquiry'), no reservation yet. */
  submitProposal: (draft: NewEventDraft) => string;
  /** Manager decision on a pending proposal. Approve creates reservations + tasks. */
  reviewProposal: (eventId: string, decision: 'approve' | 'deny', message?: string) => void;
  /** Manager replies on the proposal thread without deciding yet. */
  replyProposal: (eventId: string, body: string) => void;
  /** Attendee toggles their registration for an event. */
  toggleRegistration: (eventId: string) => void;

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

  currentUser: null,
  authReady: false,
  selectedSpaceId: 'floor-1space1',
  scrubHour: 14.5,
  realtimeStatus: 'off',

  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthReady: (ready) => set({ authReady: ready }),
  logout: () => {
    void signOut();
    set({ currentUser: null });
  },

  selectSpace: (id) => set({ selectedSpaceId: id }),
  setScrubHour: (h) => set({ scrubHour: h }),
  deployUnit: (unitId, toSpaceId) => set((state) => relocate(state, unitId, toSpaceId, 'deployed')),
  moveUnit: (unitId, toSpaceId, status) => set((state) => relocate(state, unitId, toSpaceId, status)),

  updateSpace: (id, patch) =>
    set((state) => ({
      spaces: state.spaces.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),

  updateAssetType: (id, patch) =>
    set((state) => ({
      assetTypes: state.assetTypes.map((at) => (at.id === id ? { ...at, ...patch } : at)),
    })),

  submitProposal: (draft) => {
    const id = `e-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const primaryId = draft.spaceIds[0];
    const spaceNames = draft.spaceIds
      .map((sid) => get().spaces.find((s) => s.id === sid)?.name ?? sid)
      .join(' + ');

    const thread: EventMessage[] = draft.message?.trim()
      ? [
          {
            id: `${id}-m1`,
            at: createdAt,
            fromRole: 'organizer',
            fromName: draft.organizer,
            body: draft.message.trim(),
          },
        ]
      : [];

    // Pending: no reservation/tasks until a manager approves.
    const event: EventRequest = {
      id,
      title: draft.title,
      organizer: draft.organizer,
      organizerId: draft.organizerId,
      headcount: draft.headcount,
      setupStyle: draft.setupStyle,
      window: draft.window,
      spaceId: primaryId,
      spaceIds: draft.spaceIds,
      status: 'inquiry',
      assetReqs: draft.assetReqs,
      thread,
      attendees: [],
      createdAt,
    };
    const audit: AuditEntry[] = [
      { id: `${id}-a1`, at: createdAt, actor: draft.organizer, action: 'proposal.submitted', detail: `${draft.title} — ${draft.headcount} pax @ ${spaceNames}`, eventId: id },
    ];

    set((state) => ({
      events: [...state.events, event],
      audit: [...state.audit, ...audit],
    }));
    return id;
  },

  reviewProposal: (eventId, decision, message) => {
    const actor = get().currentUser?.name ?? 'Manager';
    const at = new Date().toISOString();
    const event = get().events.find((e) => e.id === eventId);
    if (!event) return;
    const spaceIds = event.spaceIds?.length ? event.spaceIds : event.spaceId ? [event.spaceId] : [];
    const primary = get().spaces.find((s) => s.id === spaceIds[0]);
    const entrance = get().spaces.find((s) => s.type === 'entrance')?.name;

    const note: EventMessage | null = message?.trim()
      ? { id: `${eventId}-m${Date.now()}`, at, fromRole: 'manager', fromName: actor, body: message.trim() }
      : null;
    const appendThread = (e: EventRequest): EventMessage[] => [...(e.thread ?? []), ...(note ? [note] : [])];

    if (decision === 'approve') {
      const reservations: Reservation[] = spaceIds.map((sid, idx) => ({
        id: idx === 0 ? `r-${eventId}` : `r-${eventId}-${idx}`,
        eventId,
        spaceId: sid,
        window: event.window,
        assets: idx === 0 ? event.assetReqs : [],
      }));
      const tasks = primary ? deriveTasks(eventId, primary, event.setupStyle, event.headcount, entrance) : [];
      set((state) => ({
        events: state.events.map((e) => (e.id === eventId ? { ...e, status: 'confirmed', thread: appendThread(e) } : e)),
        reservations: [...state.reservations, ...reservations],
        tasks: [...state.tasks, ...tasks],
        audit: [...state.audit, { id: `${eventId}-ap`, at, actor, action: 'proposal.approved', detail: `${event.title} confirmed → assets reserved`, eventId }],
        selectedSpaceId: spaceIds[0] ?? state.selectedSpaceId,
      }));
    } else {
      set((state) => ({
        events: state.events.map((e) => (e.id === eventId ? { ...e, status: 'cancelled', thread: appendThread(e) } : e)),
        audit: [...state.audit, { id: `${eventId}-dn`, at, actor, action: 'proposal.denied', detail: `${event.title} declined`, eventId }],
      }));
    }
  },

  replyProposal: (eventId, body) => {
    if (!body.trim()) return;
    const actor = get().currentUser;
    const msg: EventMessage = {
      id: `${eventId}-m${Date.now()}`,
      at: new Date().toISOString(),
      fromRole: actor?.role ?? 'manager',
      fromName: actor?.name ?? 'Manager',
      body: body.trim(),
    };
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, thread: [...(e.thread ?? []), msg] } : e,
      ),
    }));
  },

  toggleRegistration: (eventId) => {
    const uid = get().currentUser?.id;
    if (!uid) return;
    set((state) => ({
      events: state.events.map((e) => {
        if (e.id !== eventId) return e;
        const attendees = e.attendees ?? [];
        return {
          ...e,
          attendees: attendees.includes(uid) ? attendees.filter((a) => a !== uid) : [...attendees, uid],
        };
      }),
    }));
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
