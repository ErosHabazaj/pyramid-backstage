import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Truck } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { buildForecast, demandSeries, type RiskLevel } from '@/domain/forecast';
import { Badge, Card, SectionLabel, Stat } from '@/components/ui/primitives';
import { formatTime } from '@/lib/utils';

const RISK_TONE: Record<RiskLevel, 'ok' | 'warn' | 'danger'> = {
  ok: 'ok',
  tight: 'warn',
  over: 'danger',
};
const RISK_COLOR: Record<RiskLevel, string> = {
  ok: '#1d9e75',
  tight: '#ba7517',
  over: '#e24b4a',
};
const RISK_LABEL: Record<RiskLevel, string> = {
  ok: 'OK',
  tight: 'Tight',
  over: 'Shortfall',
};

export function Forecast() {
  const { reservations, assetTypes, events, spaces } = useStore();
  const rows = buildForecast(reservations, assetTypes).sort((a, b) => b.utilization - a.utilization);

  const atRisk = rows.filter((r) => r.risk !== 'ok');
  const over = rows.filter((r) => r.risk === 'over');
  const [selected, setSelected] = useState(rows[0]?.assetTypeId ?? 'chair');
  const selectedRow = rows.find((r) => r.assetTypeId === selected) ?? rows[0];
  const series = demandSeries(reservations, selected);

  // Transport-aware routing: each event sources assets from its nearest store.
  const routing = reservations.map((r) => {
    const ev = events.find((e) => e.id === r.eventId);
    const space = spaces.find((s) => s.id === r.spaceId);
    const store = spaces.find((s) => s.id === space?.nearestStorageId);
    return { eventTitle: ev?.title ?? r.eventId, spaceName: space?.name, storeName: store?.name };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium">Predictive allocation</h1>
        <p className="text-sm text-muted">
          Peak demand across the whole pipeline — shortfalls flagged before they happen.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Assets at risk" value={atRisk.length} tone={atRisk.length ? 'danger' : 'default'} />
        <Stat label="Over capacity" value={over.length} tone={over.length ? 'danger' : 'default'} />
        <Stat label="Asset types tracked" value={rows.length} />
      </div>

      <Card className="p-4">
        <SectionLabel>Peak utilization</SectionLabel>
        <div className="space-y-2">
          {rows.map((r) => (
            <button
              key={r.assetTypeId}
              onClick={() => setSelected(r.assetTypeId)}
              className={`w-full rounded-lg border p-3 text-left transition hover:bg-surface-2 ${r.assetTypeId === selected ? 'border-info' : 'border-line'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{r.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted">
                    peak {r.peakDemand} / {r.available}
                  </span>
                  <Badge tone={RISK_TONE[r.risk]}>{RISK_LABEL[r.risk]}</Badge>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded bg-surface-2">
                <div
                  className="h-1.5 rounded"
                  style={{ width: `${Math.min(100, Math.round(r.utilization * 100))}%`, background: RISK_COLOR[r.risk] }}
                />
              </div>
              {r.peakWindow && (
                <div className="mt-1 text-xs text-faint">
                  peak {formatTime(r.peakWindow.start)}–{formatTime(r.peakWindow.end)}
                  {r.shortfall > 0 ? ` · short ${r.shortfall}` : ` · ${r.reserve} held in reserve`}
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>

      {selectedRow && (
        <Card className="p-4">
          <SectionLabel>{selectedRow.label} — demand across the day</SectionLabel>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#eceae3" vertical={false} />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 11, fill: '#6b6b66' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b6b66' }} />
                <Tooltip
                  labelFormatter={(h) => `${h}:00`}
                  formatter={(v) => [`${v} units`, 'demand']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e4e7' }}
                />
                <ReferenceLine
                  y={selectedRow.available}
                  stroke="#e24b4a"
                  strokeDasharray="4 3"
                  label={{ value: `available ${selectedRow.available}`, position: 'insideTopRight', fontSize: 11, fill: '#e24b4a' }}
                />
                <Area type="monotone" dataKey="demand" stroke="#378add" fill="#e6f1fb" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Truck size={16} /> Transport-aware sourcing
        </div>
        <p className="mb-3 text-xs text-muted">
          Each event draws equipment from its nearest store to minimise moves.
        </p>
        <div className="space-y-1.5">
          {routing.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
              <span>{r.eventTitle}</span>
              <span className="text-xs text-muted">
                {r.storeName ?? '—'} → {r.spaceName ?? '—'}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
