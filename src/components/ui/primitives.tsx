import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('glass rounded-xl', className)}>{children}</div>;
}

export function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'danger';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border-2 px-4 py-3 shadow-[3px_3px_0_0_var(--color-ink)]',
        tone === 'danger' ? 'border-danger bg-[#fbe2e2]' : 'border-ink bg-surface',
      )}
    >
      <div className={cn('text-xs font-semibold tracking-wide uppercase', tone === 'danger' ? 'text-danger' : 'text-muted')}>
        {label}
      </div>
      <div className={cn('font-display text-2xl font-bold', tone === 'danger' && 'text-danger')}>
        {value}
      </div>
    </div>
  );
}

type Tone = 'neutral' | 'blue' | 'orange' | 'green' | 'yellow' | 'danger' | 'warn' | 'ok' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'border-ink/25 bg-surface-2 text-ink',
  blue: 'border-purple/45 bg-hall-blue text-hall-blue-ink',
  orange: 'border-orange/45 bg-hall-orange text-hall-orange-ink',
  green: 'border-olive/55 bg-hall-green text-hall-green-ink',
  yellow: 'border-[#876a12]/45 bg-hall-yellow text-hall-yellow-ink',
  danger: 'border-danger/45 bg-[#fbe2e2] text-danger',
  warn: 'border-warn/45 bg-[#fceada] text-warn',
  ok: 'border-olive/55 bg-hall-green text-hall-green-ink',
  info: 'border-orange/45 bg-hall-orange text-info',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border-[1.5px] px-2 py-0.5 text-xs font-bold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary';
}

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-md border-2 px-3 py-1.5 text-sm font-semibold shadow-[3px_3px_0_0_var(--color-ink)] transition-all hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/60',
        variant === 'primary'
          ? 'border-ink bg-info text-white hover:bg-orange-ink'
          : 'border-ink bg-surface text-ink hover:bg-surface-2',
        className,
      )}
      {...props}
    />
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-ink uppercase before:h-3 before:w-1.5 before:rounded-sm before:bg-orange before:content-['']">
      {children}
    </div>
  );
}
