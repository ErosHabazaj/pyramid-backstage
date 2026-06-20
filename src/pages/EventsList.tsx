import { useStore } from '@/store/useStore';
import { Badge, Card } from '@/components/ui/primitives';
import { generateQuote } from '@/domain/pricing';
import { formatEuro, formatTime } from '@/lib/utils';

const TONE: Record<string, 'ok' | 'info' | 'warn' | 'neutral'> = {
  live: 'ok',
  confirmed: 'info',
  'in-prep': 'warn',
  done: 'neutral',
};

export function EventsList() {
  const { events, spaces, tasks, assetTypes } = useStore();

  const hoursOf = (startIso: string, endIso: string) =>
    Math.max(1, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 3.6e6));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium">Events</h1>
        <p className="text-sm text-muted">Every request, its space, assets and operational plan.</p>
      </div>

      <div className="space-y-3">
        {[...events]
          .sort((a, b) => a.window.start.localeCompare(b.window.start))
          .map((e) => {
            const space = spaces.find((s) => s.id === e.spaceId);
            const eventTasks = tasks.filter((t) => t.eventId === e.id);
            const done = eventTasks.filter((t) => t.done).length;
            const quote = space
              ? generateQuote({
                  space,
                  setupStyle: e.setupStyle,
                  headcount: e.headcount,
                  hours: hoursOf(e.window.start, e.window.end),
                  assetReqs: e.assetReqs,
                  assetTypes,
                })
              : null;
            return (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-medium">{e.title}</div>
                    <div className="text-sm text-muted">
                      {e.organizer} · {space?.name} · {formatTime(e.window.start)}–{formatTime(e.window.end)} ·{' '}
                      {e.headcount} pax
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={TONE[e.status] ?? 'neutral'}>{e.status}</Badge>
                    {quote && <span className="text-sm font-medium tabular-nums">{formatEuro(quote.total)}</span>}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {e.assetReqs.slice(0, 6).map((a) => (
                    <Badge key={a.assetTypeId}>
                      {a.quantity}× {a.assetTypeId.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>

                {eventTasks.length > 0 && (
                  <div className="mt-3 text-xs text-muted">
                    Operational plan: {done}/{eventTasks.length} tasks complete
                  </div>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}
