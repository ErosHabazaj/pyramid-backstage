import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

// ── Date helpers (local 'YYYY-MM-DD' keys, timezone-safe) ─────────────
export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

/** '2026-06-27' → 'Sat 27 Jun 2026' */
export function prettyDate(key: string): string {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
