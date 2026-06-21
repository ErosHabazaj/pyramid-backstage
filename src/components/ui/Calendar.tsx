import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, cn, monthLabel, ymd } from '@/lib/utils';

export interface DayMarker {
  /** Number shown as a small count chip on the day. */
  count?: number;
  /** Dot/accent color token class, e.g. 'bg-info'. Defaults to a neutral dot. */
  dotClass?: string;
}

interface CalendarProps {
  /** Currently selected day key ('YYYY-MM-DD'). */
  selected?: string;
  onSelect?: (day: string) => void;
  /** Per-day markers keyed by 'YYYY-MM-DD'. */
  markers?: Record<string, DayMarker>;
  /** Disable days strictly before this key (e.g. today, for proposals). */
  minDay?: string;
  className?: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday-first month grid. Presentational + keyboard accessible. */
export function Calendar({ selected, onSelect, markers = {}, minDay, className }: CalendarProps) {
  const initial = selected ? new Date(selected) : new Date();
  const [view, setView] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  // Monday = 0 … Sunday = 6
  const leadBlanks = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = ymd(new Date());

  const cells: (string | null)[] = [
    ...Array.from({ length: leadBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ymd(new Date(year, month, i + 1))),
  ];

  return (
    <div className={cn('select-none', className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">{monthLabel(view)}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setView(addMonths(view, -1))}
            className="cursor-pointer rounded-md border border-line p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-info"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setView(addMonths(view, 1))}
            className="cursor-pointer rounded-md border border-line p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-info"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-faint">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((key, i) => {
          if (!key) return <div key={`b${i}`} />;
          const day = Number(key.slice(8));
          const marker = markers[key];
          const isSelected = key === selected;
          const isToday = key === todayKey;
          const disabled = minDay ? key < minDay : false;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled || !onSelect}
              aria-pressed={isSelected}
              aria-label={key}
              onClick={() => onSelect?.(key)}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors',
                onSelect && !disabled && 'cursor-pointer hover:bg-surface-2',
                isSelected
                  ? 'border-info bg-hall-blue font-medium text-info'
                  : 'border-transparent text-ink',
                isToday && !isSelected && 'border-line-strong',
                disabled && 'cursor-not-allowed text-faint opacity-50',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-info',
              )}
            >
              <span>{day}</span>
              {marker && (
                <span className="mt-0.5 flex items-center gap-0.5">
                  {marker.count != null ? (
                    <span className="rounded-full bg-info px-1 text-[9px] font-medium leading-tight text-white">
                      {marker.count}
                    </span>
                  ) : (
                    <span className={cn('h-1.5 w-1.5 rounded-full', marker.dotClass ?? 'bg-info')} />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
