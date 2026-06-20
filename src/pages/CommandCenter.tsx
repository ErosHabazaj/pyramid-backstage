import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Clock, MapPin, Mic } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { detectConflicts } from '@/domain/conflicts';
import { resolutionsFor } from '@/domain/resolutions';
import { conflictSpaceIds, spaceStatusAt, STATUS_LABEL } from '@/domain/status';
import { capacities, SETUP_LABEL } from '@/domain/capacity';
import type { TimeWindow } from '@/domain/types';
import { FloorStack } from '@/components/map/FloorStack';
import { Badge, Card, SectionLabel, Stat } from '@/components/ui/primitives';
import { formatTime } from '@/lib/utils';

const hf = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
};
const within = (h: number, w: TimeWindow) => h >= hf(w.setupStart) && h <= hf(w.teardownEnd);
const pad = (n: number) => String(n).padStart(2, '0');

const STATUS_TONE: Record<string, 'ok' | 'info' | 'warn' | 'neutral'> = {
  live: 'ok',
  confirmed: 'info',
  'in-prep': 'warn',
  setup: 'warn',
  done: 'neutral',
};

export function CommandCenter() {
  const {
    spaces,
    events,
    assetTypes,
    assetUnits,
    reservations,
    scrubHour,
    selectedSpaceId,
    selectSpace,
    setScrubHour,
    applyResolution,
  } = useStore();
  const [toast, setToast] = useState<string | null>(null);

  const conflicts = useMemo(
    () => detectConflicts(reservations, spaces, assetTypes),
    [reservations, spaces, assetTypes],
  );
  const cSpaceIds = useMemo(() => conflictSpaceIds(conflicts, events), [conflicts, events]);
  const resCtx = { events, reservations, spaces, assetTypes };

  const mainHalls = spaces.filter((s) => s.type === 'main-hall');
  const freeHalls = mainHalls.filter(
    (h) => spaceStatusAt(h, events, scrubHour, cSpaceIds) === 'free',
  ).length;
  const activeEvents = events.filter((e) => e.spaceId && within(scrubHour, e.window)).length;

  const reservedAt = (typeId: string) =>
    events
      .filter((e) => e.spaceId && within(scrubHour, e.window))
      .reduce(
        (s, e) => s + (e.assetReqs.find((a) => a.assetTypeId === typeId)?.quantity ?? 0),
        0,
      );

  const forecast = ['chair', 'mic-lav', 'table-round'].map((id) => {
    const at = assetTypes.find((t) => t.id === id)!;
    const available = at.totalStock - at.maintenanceReserve;
    const reserved = reservedAt(id);
    return {
      id,
      label: at.label,
      reserved,
      available,
      pct: Math.min(100, Math.round((reserved / available) * 100)),
    };
  });
  const chairsPct = forecast[0].pct;

  const selected = spaces.find((s) => s.id === selectedSpaceId) ?? null;
  const selectedCaps = selected ? capacities(selected) : null;
  const selectedDeployed = selected
    ? assetUnits
        .filter((u) => u.locationSpaceId === selected.id && u.status === 'deployed')
        .reduce((s, u) => s + u.quantity, 0)
    : 0;

  const H = Math.floor(scrubHour);
  const M = Math.round((scrubHour - H) * 60);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-medium">Command center</h1>
          <p className="text-sm text-muted">Pyramid of Tirana · Thu 19 Jun · single source of truth</p>
        </div>
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-ok" /> Live
        </span>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-lg bg-[#e1f5ee] px-3 py-2 text-sm text-ok">
          <Check size={15} /> Resolved: {toast}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active events" value={activeEvents} />
        <Stat label="Halls free" value={`${freeHalls} / ${mainHalls.length}`} />
        <Stat
          label="Conflicts"
          value={conflicts.length}
          tone={conflicts.length ? 'danger' : 'default'}
        />
        <Stat label="Chairs load" value={`${chairsPct}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Map */}
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Digital twin</span>
            <span className="text-xs text-faint">tap a space</span>
          </div>
          <FloorStack
            spaces={spaces}
            events={events}
            assetUnits={assetUnits}
            scrubHour={scrubHour}
            conflictSpaceIds={cSpaceIds}
            selectedSpaceId={selectedSpaceId}
            onSelect={selectSpace}
          />
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            {(['live', 'setup', 'free', 'conflict'] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[3px]"
                  style={{
                    background: { live: '#1d9e75', setup: '#ba7517', free: '#9a9a93', conflict: '#e24b4a' }[s],
                  }}
                />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>08:00</span>
              <span className="font-medium text-ink">
                {pad(H)}:{pad(M)} — scrub the day
              </span>
              <span>22:00</span>
            </div>
            <input
              type="range"
              min={8}
              max={22}
              step={0.5}
              value={scrubHour}
              onChange={(e) => setScrubHour(parseFloat(e.target.value))}
              className="w-full"
              aria-label="Time of day"
            />
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          <Card className="p-4">
            <SectionLabel>Alerts</SectionLabel>
            {conflicts.length === 0 && (
              <p className="text-sm text-muted">No conflicts. Everything fits.</p>
            )}
            <div className="space-y-2">
              {conflicts.map((c, i) => {
                const tone = c.severity === 'warning' ? 'warn' : 'danger';
                const Icon = c.kind === 'asset' ? Mic : c.kind === 'space' ? MapPin : AlertTriangle;
                const plans = resolutionsFor(c, resCtx);
                return (
                  <div
                    key={i}
                    className={`rounded-lg p-3 ${tone === 'danger' ? 'bg-[#fcebeb]' : 'bg-[#faeeda]'}`}
                  >
                    <div
                      className={`flex items-center gap-2 text-sm font-medium ${tone === 'danger' ? 'text-danger' : 'text-warn'}`}
                    >
                      <Icon size={15} /> {c.kind === 'asset' ? 'Resource conflict' : c.kind === 'space' ? 'Space clash' : 'Spillover'}
                    </div>
                    <p className={`mt-1 text-xs ${tone === 'danger' ? 'text-danger' : 'text-warn'}`}>
                      {c.message}
                    </p>
                    {plans.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {plans.map((plan, j) => (
                          <button
                            key={j}
                            onClick={() => {
                              applyResolution(plan);
                              setToast(plan.label);
                            }}
                            className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink transition hover:bg-surface-2 active:scale-[0.98]"
                          >
                            {plan.label}
                            {plan.detail ? <span className="text-muted"> · {plan.detail}</span> : null}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted">Monitor — coexistence OK.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {selected && selectedCaps && (
            <Card className="p-4">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-[3px]"
                  style={{ background: selected.color?.fill ?? '#e7e7e2', border: `1px solid ${selected.color?.ink ?? '#b7b7af'}` }}
                />
                <span className="text-base font-medium">{selected.name}</span>
              </div>
              <div className="mb-3 text-xs text-faint">
                {selected.floor === 0 ? 'Floor 0' : 'Floor −1'} · {selected.type.replace('-', ' ')}
              </div>

              <div className="mb-3 flex gap-2">
                <div className="flex-1 rounded-md bg-surface-2 px-3 py-2">
                  <div className="text-xs text-muted">Usable area</div>
                  <div className="text-lg font-medium">{selected.areaM2} m²</div>
                </div>
                <div className="flex-1 rounded-md bg-surface-2 px-3 py-2">
                  <div className="text-xs text-muted">Deployed now</div>
                  <div className="text-lg font-medium">{selectedDeployed}</div>
                </div>
              </div>

              {selected.bookable ? (
                <>
                  <SectionLabel>Capacity by setup</SectionLabel>
                  <div className="space-y-1">
                    {(['theater', 'banquet', 'classroom', 'standing'] as const).map((style) => (
                      <div key={style} className="flex justify-between text-xs">
                        <span className="text-muted">{SETUP_LABEL[style]}</span>
                        <span>{selectedCaps[style]}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted">Service space — not bookable for events.</p>
              )}

              {selected.features.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.features.map((f) => (
                    <Badge key={f}>{f.replace('-', ' ')}</Badge>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionLabel>Resource forecast · {pad(H)}:{pad(M)}</SectionLabel>
          <div className="space-y-3">
            {forecast.map((f) => (
              <div key={f.id}>
                <div className="flex justify-between text-xs text-muted">
                  <span>{f.label}</span>
                  <span>
                    {f.reserved} / {f.available}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-surface-2">
                  <div
                    className="h-1.5 rounded"
                    style={{
                      width: `${f.pct}%`,
                      background: f.pct >= 90 ? '#e24b4a' : f.pct >= 70 ? '#ba7517' : '#1d9e75',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <SectionLabel>Today’s events</SectionLabel>
          <div className="divide-y divide-line">
            {[...events]
              .sort((a, b) => a.window.start.localeCompare(b.window.start))
              .map((e) => {
                const space = spaces.find((s) => s.id === e.spaceId);
                return (
                  <div key={e.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm font-medium">{e.title}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <Clock size={12} /> {formatTime(e.window.start)}–{formatTime(e.window.end)} ·{' '}
                        {space?.name} · {e.headcount} pax
                      </div>
                    </div>
                    <Badge tone={STATUS_TONE[e.status] ?? 'neutral'}>{e.status}</Badge>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}
