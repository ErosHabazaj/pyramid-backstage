import type { AssetType, Reservation, TimeWindow } from './types';

// ── Predictive allocation / forecast ─────────────────────────────────
// Looks across the whole pipeline (not just "now") to find each asset's
// PEAK concurrent demand, compares it to available stock minus the
// held-back reserve, and flags shortfall risk before it happens.

const hourFrac = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
};

export type RiskLevel = 'ok' | 'tight' | 'over';

export interface ForecastRow {
  assetTypeId: string;
  label: string;
  stock: number;
  reserve: number;
  available: number;
  peakDemand: number;
  peakWindow: { start: string; end: string } | null;
  utilization: number; // peakDemand / available
  risk: RiskLevel;
  /** Units short at peak (0 unless over). */
  shortfall: number;
}

interface Demand {
  qty: number;
  w: TimeWindow;
}

function demandsFor(reservations: Reservation[], assetTypeId: string): Demand[] {
  return reservations
    .map((r) => {
      const need = r.assets.find((a) => a.assetTypeId === assetTypeId);
      return need ? { qty: need.quantity, w: r.window } : null;
    })
    .filter((d): d is Demand => d !== null);
}

export function buildForecast(
  reservations: Reservation[],
  assetTypes: AssetType[],
): ForecastRow[] {
  return assetTypes.map((at) => {
    const available = at.totalStock - at.maintenanceReserve;
    const demands = demandsFor(reservations, at.id);

    let peakDemand = 0;
    let peakWindow: { start: string; end: string } | null = null;
    if (demands.length) {
      const ticks = [
        ...new Set(demands.flatMap((d) => [d.w.setupStart, d.w.teardownEnd])),
      ].sort();
      for (let i = 0; i < ticks.length - 1; i++) {
        const t0 = ticks[i];
        const t1 = ticks[i + 1];
        const total = demands
          .filter((d) => d.w.setupStart <= t0 && d.w.teardownEnd >= t1)
          .reduce((s, d) => s + d.qty, 0);
        if (total > peakDemand) {
          peakDemand = total;
          peakWindow = { start: t0, end: t1 };
        }
      }
    }

    const utilization = available > 0 ? peakDemand / available : 0;
    const risk: RiskLevel =
      peakDemand > available ? 'over' : peakDemand > available * 0.85 ? 'tight' : 'ok';

    return {
      assetTypeId: at.id,
      label: at.label,
      stock: at.totalStock,
      reserve: at.maintenanceReserve,
      available,
      peakDemand,
      peakWindow,
      utilization,
      risk,
      shortfall: Math.max(0, peakDemand - available),
    };
  });
}

export interface SeriesPoint {
  hour: number;
  demand: number;
}

/** Hourly demand curve for one asset across the operating day (single-day view). */
export function demandSeries(
  reservations: Reservation[],
  assetTypeId: string,
  from = 8,
  to = 22,
): SeriesPoint[] {
  const demands = demandsFor(reservations, assetTypeId);
  const pts: SeriesPoint[] = [];
  for (let h = from; h <= to; h++) {
    const demand = demands
      .filter((d) => hourFrac(d.w.setupStart) <= h && hourFrac(d.w.teardownEnd) >= h)
      .reduce((s, d) => s + d.qty, 0);
    pts.push({ hour: h, demand });
  }
  return pts;
}
