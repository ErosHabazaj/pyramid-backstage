import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('rounded-xl border border-line bg-surface', className)}>
      {children}
    </div>
  );
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
    <div className="rounded-lg bg-surface-2 px-4 py-3">
      <div className={cn('text-xs', tone === 'danger' ? 'text-danger' : 'text-muted')}>
        {label}
      </div>
      <div className={cn('text-2xl font-medium', tone === 'danger' && 'text-danger')}>
        {value}
      </div>
    </div>
  );
}

type Tone = 'neutral' | 'blue' | 'orange' | 'green' | 'yellow' | 'danger' | 'warn' | 'ok' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  blue: 'bg-hall-blue text-hall-blue-ink',
  orange: 'bg-hall-orange text-hall-orange-ink',
  green: 'bg-hall-green text-hall-green-ink',
  yellow: 'bg-hall-yellow text-hall-yellow-ink',
  danger: 'bg-[#fcebeb] text-danger',
  warn: 'bg-[#faeeda] text-warn',
  ok: 'bg-[#e1f5ee] text-ok',
  info: 'bg-hall-blue text-info',
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
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
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
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition active:scale-[0.98] disabled:opacity-50',
        variant === 'primary'
          ? 'border-transparent bg-ink text-white hover:opacity-90'
          : 'border-line-strong bg-surface hover:bg-surface-2',
        className,
      )}
      {...props}
    />
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
      {children}
    </div>
  );
}
