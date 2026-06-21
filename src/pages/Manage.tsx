import { lazy, Suspense, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import type { Space } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { capacities, SETUP_LABEL } from '@/domain/capacity';
import { detectConflicts } from '@/domain/conflicts';
import { conflictSpaceIds } from '@/domain/status';
import { Badge, Card, SectionLabel } from '@/components/ui/primitives';

const Pyramid3D = lazy(() => import('@/components/map/Pyramid3D'));
const num = (v: string, min = 0) => Math.max(min, Math.round(Number(v) || 0));

const FEATURE_LABEL: Record<string, string> = {
  stage: 'Stage',
  'av-rig': 'AV rig',
  'step-free': 'Step-free',
  'natural-light': 'Natural light',
  power: 'Power',
};

export function Manage() {
  const {
    spaces,
    events,
    reservations,
    assetTypes,
    assetUnits,
    scrubHour,
    selectedSpaceId,
    selectSpace,
    updateSpace,
  } = useStore();

  const conflicts = useMemo(
    () => detectConflicts(reservations, spaces, assetTypes),
    [reservations, spaces, assetTypes],
  );
  const cSpaceIds = useMemo(() => conflictSpaceIds(conflicts, events), [conflicts, events]);
  const selected = spaces.find((s) => s.id === selectedSpaceId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium">Manage venue</h1>
        <p className="text-sm text-muted">Tap a room in the twin to view and edit its details.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Digital twin</span>
            <span className="text-xs text-faint">tap a room to edit</span>
          </div>
          <Suspense
            fallback={
              <div className="flex h-[340px] w-full items-center justify-center rounded-lg border border-white/10 text-sm text-muted" style={{ background: '#0a1416' }}>
                Loading 3D twin…
              </div>
            }
          >
            <Pyramid3D
              spaces={spaces}
              events={events}
              scrubHour={scrubHour}
              conflictSpaceIds={cSpaceIds}
              selectedSpaceId={selectedSpaceId}
              onSelect={selectSpace}
            />
          </Suspense>
        </Card>

        <Card className="p-4">
          {selected ? (
            <RoomEditor
              key={selected.id}
              space={selected}
              assetsHere={assetUnits.filter((u) => u.locationSpaceId === selected.id)}
              assetLabel={(id) => assetTypes.find((t) => t.id === id)?.label ?? id}
              onChange={(patch) => updateSpace(selected.id, patch)}
            />
          ) : (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center text-sm text-muted">
              <MapPin size={20} className="mb-2 text-faint" />
              Select a room in the twin to see and edit its info.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function RoomEditor({
  space,
  assetsHere,
  assetLabel,
  onChange,
}: {
  space: Space;
  assetsHere: { id: string; assetTypeId: string; quantity: number; status: string }[];
  assetLabel: (id: string) => string;
  onChange: (patch: Partial<Space>) => void;
}) {
  const cap = capacities(space);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>Room details</SectionLabel>
        <div className="flex gap-1.5">
          <Badge tone="neutral">{space.floor === 0 ? 'Floor 0' : 'Floor −1'}</Badge>
          <Badge tone={space.bookable ? 'info' : 'warn'}>{space.bookable ? 'Bookable' : 'Not bookable'}</Badge>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="text-xs text-muted">
          Name
          <input
            value={space.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-line-strong"
          />
        </label>
        <label className="text-xs text-muted">
          Usable area (m²)
          <input
            type="number"
            min={1}
            value={space.areaM2}
            onChange={(e) => onChange({ areaM2: num(e.target.value, 1) })}
            className="mt-1 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm tabular-nums text-ink outline-none focus:border-line-strong sm:w-28"
          />
        </label>
      </div>

      <label className="block text-xs text-muted">
        Info
        <input
          value={space.note ?? ''}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Notes shown to organizers (features, restrictions, …)"
          className="mt-1 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-line-strong"
        />
      </label>

      <div>
        <SectionLabel>Capacity by setup</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5 text-sm">
          {(['theater', 'banquet', 'classroom', 'standing'] as const).map((style) => (
            <div key={style} className="flex items-center justify-between rounded-md border border-white/5 bg-white/5 px-2.5 py-1">
              <span className="text-muted">{SETUP_LABEL[style]}</span>
              <span className="font-medium tabular-nums">{cap[style]}</span>
            </div>
          ))}
        </div>
      </div>

      {space.features.length > 0 && (
        <div>
          <SectionLabel>Features</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {space.features.map((f) => (
              <Badge key={f} tone="neutral">
                {FEATURE_LABEL[f] ?? f}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Assets here ({assetsHere.length})</SectionLabel>
        {assetsHere.length === 0 ? (
          <p className="text-xs text-muted">No carts currently in this room.</p>
        ) : (
          <div className="space-y-1">
            {assetsHere.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-md border border-line px-2.5 py-1 text-sm">
                <span>
                  {u.quantity}× {assetLabel(u.assetTypeId)}
                </span>
                <Badge tone={u.status === 'deployed' ? 'info' : 'neutral'}>{u.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
