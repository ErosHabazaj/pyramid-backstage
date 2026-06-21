import { useMemo, useState } from 'react';
import { Check, MapPin, UserPlus, Users } from 'lucide-react';
import type { EventStatus } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { Calendar, type DayMarker } from '@/components/ui/Calendar';
import { Badge, Button, Card, SectionLabel } from '@/components/ui/primitives';
import { formatTime, prettyDate, ymd } from '@/lib/utils';

// Events the public can see (pending/declined proposals stay private).
const PUBLIC_STATUSES: EventStatus[] = ['confirmed', 'in-prep', 'live', 'done'];

export function EventsCalendar() {
  const { events, spaces, currentUser, toggleRegistration } = useStore();
  const [selected, setSelected] = useState<string>(() => {
    const next = [...events]
      .filter((e) => PUBLIC_STATUSES.includes(e.status))
      .map((e) => e.window.start.slice(0, 10))
      .sort()
      .find((d) => d >= ymd(new Date()));
    return next ?? ymd(new Date());
  });

  const publicEvents = useMemo(
    () => events.filter((e) => PUBLIC_STATUSES.includes(e.status)),
    [events],
  );

  const markers = useMemo(() => {
    const m: Record<string, DayMarker> = {};
    for (const e of publicEvents) {
      const key = e.window.start.slice(0, 10);
      m[key] = { count: (m[key]?.count ?? 0) + 1 };
    }
    return m;
  }, [publicEvents]);

  const dayEvents = publicEvents
    .filter((e) => e.window.start.slice(0, 10) === selected)
    .sort((a, b) => a.window.start.localeCompare(b.window.start));

  const roomNames = (e: (typeof events)[number]) =>
    (e.spaceIds ?? (e.spaceId ? [e.spaceId] : []))
      .map((id) => spaces.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(' + ');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium">Event calendar</h1>
        <p className="text-sm text-muted">Browse what’s on at the Pyramid and register to attend.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="p-4">
          <Calendar selected={selected} onSelect={setSelected} markers={markers} />
        </Card>

        <Card className="p-4">
          <SectionLabel>{prettyDate(selected)}</SectionLabel>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted">No events on this day. Pick a highlighted date.</p>
          ) : (
            <div className="space-y-2">
              {dayEvents.map((e) => {
                const registered = currentUser ? (e.attendees ?? []).includes(currentUser.id) : false;
                const count = (e.attendees ?? []).length;
                return (
                  <div key={e.id} className="rounded-lg border border-line p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{e.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                          <span>
                            {formatTime(e.window.start)}–{formatTime(e.window.end)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {roomNames(e)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={11} /> {count} registered
                          </span>
                        </div>
                      </div>
                      {e.status === 'live' && <Badge tone="ok">Live</Badge>}
                    </div>
                    <div className="mt-2.5">
                      <Button
                        variant={registered ? 'default' : 'primary'}
                        onClick={() => toggleRegistration(e.id)}
                      >
                        {registered ? (
                          <>
                            <Check size={14} /> Registered
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} /> Register
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
