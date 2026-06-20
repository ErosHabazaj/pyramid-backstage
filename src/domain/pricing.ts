import type {
  AssetCategory,
  AssetRequirement,
  AssetType,
  SetupStyle,
  Space,
} from './types';

// ── Pricing engine ───────────────────────────────────────────────────
// Deterministic, line-item quotation. Never AI — the proposal *prose* is
// generated language, but every number here is computed in code.
// Currency: EUR. Albania VAT = 20%.

export const VAT_RATE = 0.2;

/** Per-unit rental price per event, by asset category (EUR). */
export const ASSET_PRICES: Record<AssetCategory, number> = {
  chair: 1.5,
  'table-round': 8,
  'table-rect': 6,
  'mic-handheld': 15,
  'mic-lav': 20,
  projector: 60,
  screen: 25,
  speaker: 18,
  lectern: 12,
  riser: 10,
};

/** Hourly hire rate for a space, derived from its usable area. */
export function spaceHourlyRate(space: Space): number {
  return Math.round(space.areaM2 * 0.5);
}

export type QuoteCategory = 'space' | 'assets' | 'labor';

export interface QuoteLine {
  label: string;
  detail?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
  category: QuoteCategory;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  vatRate: number;
  vat: number;
  total: number;
}

export interface QuoteInput {
  space: Space;
  setupStyle: SetupStyle;
  headcount: number;
  /** Event duration in hours (excludes setup/teardown). */
  hours: number;
  assetReqs: AssetRequirement[];
  assetTypes: AssetType[];
}

export function generateQuote(input: QuoteInput): Quote {
  const { space, setupStyle, headcount, hours, assetReqs, assetTypes } = input;
  const lines: QuoteLine[] = [];

  // Space hire
  const rate = spaceHourlyRate(space);
  lines.push({
    label: `${space.name} hire`,
    detail: `${hours}h · ${setupStyle} setup`,
    qty: hours,
    unit: 'h',
    unitPrice: rate,
    amount: rate * hours,
    category: 'space',
  });

  // Asset rental
  for (const req of assetReqs) {
    const at = assetTypes.find((t) => t.id === req.assetTypeId);
    if (!at) continue;
    const unitPrice = ASSET_PRICES[at.category] ?? 0;
    if (unitPrice === 0 || req.quantity === 0) continue;
    lines.push({
      label: at.label,
      qty: req.quantity,
      unit: 'unit',
      unitPrice,
      amount: Math.round(unitPrice * req.quantity * 100) / 100,
      category: 'assets',
    });
  }

  // Labour & services
  const labour = Math.round(150 + headcount * 0.8);
  lines.push({
    label: 'Setup, teardown & on-site support',
    detail: 'operations crew',
    qty: 1,
    unit: 'event',
    unitPrice: labour,
    amount: labour,
    category: 'labor',
  });
  lines.push({
    label: 'Cleaning & reset',
    qty: 1,
    unit: 'event',
    unitPrice: 60,
    amount: 60,
    category: 'labor',
  });

  const subtotal = Math.round(lines.reduce((s, l) => s + l.amount, 0));
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat;

  return { lines, subtotal, vatRate: VAT_RATE, vat, total };
}
