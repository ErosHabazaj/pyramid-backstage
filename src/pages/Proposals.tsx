import { useState } from 'react';
import { AlertTriangle, Check, Send, Users, X } from 'lucide-react';
import type { EventRequest, Space } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { windowsOverlap } from '@/domain/conflicts';
import { Badge, Button, Card, SectionLabel } from '@/components/ui/primitives';
import { cn, formatTime, prettyDate } from '@/lib/utils';

const DECIDED_TONE = { confirmed: 'ok', cancelled: 'danger' } as const;
const DECIDED_LABEL: Record<string, string> = { confirmed: 'Approved', cancelled: 'Declined' };

export function Proposals() {
  const { events, spaces, reservations, assetTypes, reviewProposal, replyProposal } = useStore();

  const pending = events
    .filter((e) => e.status === 'inquiry')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const decided = events
    .filter((e) => e.status === 'confirmed' || e.status === 'cancelled')
    .filter((e) => e.organizerId) // only organizer-submitted ones
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium">Event proposals</h1>
        <p className="text-sm text-muted">
          Review incoming requests — accept to reserve rooms &amp; assets, decline, or reply for changes.
        </p>
      </div>

      <Card className="p-4">
        <SectionLabel>Awaiting review ({pending.length})</SectionLabel>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Nothing to review right now. New proposals will appear here.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((e) => (
              <ReviewCard
                key={e.id}
                event={e}
                spaces={spaces}
                assetTypes={assetTypes}
                clashes={findClashes(e, reservations, spaces)}
                onReply={(body) => replyProposal(e.id, body)}
                onDecide={(decision, message) => reviewProposal(e.id, decision, message)}
              />
            ))}
          </div>
        )}
      </Card>

      {decided.length > 0 && (
        <Card className="p-4">
          <SectionLabel>Recently decided</SectionLabel>
          <div className="divide-y divide-line">
            {decided.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium">{e.title}</div>
                  <div className="text-xs text-muted">
                    {e.organizer} · {prettyDate(e.window.start.slice(0, 10))} · {e.headcount} pax
                  </div>
                </div>
                <Badge tone={DECIDED_TONE[e.status as keyof typeof DECIDED_TONE] ?? 'neutral'}>
                  {DECIDED_LABEL[e.status] ?? e.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/** Existing reservations on the same rooms whose windows overlap the proposal. */
function findClashes(
  event: EventRequest,
  reservations: { spaceId: string; window: EventRequest['window']; eventId: string }[],
  spaces: Space[],
): string[] {
  const ids = new Set(event.spaceIds ?? (event.spaceId ? [event.spaceId] : []));
  const names = new Set<string>();
  for (const r of reservations) {
    if (ids.has(r.spaceId) && windowsOverlap(r.window, event.window)) {
      names.add(spaces.find((s) => s.id === r.spaceId)?.name ?? r.spaceId);
    }
  }
  return [...names];
}

function ReviewCard({
  event,
  spaces,
  assetTypes,
  clashes,
  onReply,
  onDecide,
}: {
  event: EventRequest;
  spaces: Space[];
  assetTypes: { id: string; label: string }[];
  clashes: string[];
  onReply: (body: string) => void;
  onDecide: (decision: 'approve' | 'deny', message?: string) => void;
}) {
  const [message, setMessage] = useState('');
  const rooms = (event.spaceIds ?? (event.spaceId ? [event.spaceId] : []))
    .map((id) => spaces.find((s) => s.id === id)?.name)
    .filter(Boolean)
    .join(' + ');
  const assetSummary = event.assetReqs
    .slice(0, 5)
    .map((a) => `${a.quantity}× ${assetTypes.find((t) => t.id === a.assetTypeId)?.label ?? a.assetTypeId}`)
    .join(', ');

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{event.title}</div>
          <div className="text-xs text-muted">
            {event.organizer} · {rooms} · {prettyDate(event.window.start.slice(0, 10))} ·{' '}
            {formatTime(event.window.start)}–{formatTime(event.window.end)}
          </div>
        </div>
        <Badge tone="info">
          <Users size={11} className="mr-1" />
          {event.headcount} pax
        </Badge>
      </div>

      {assetSummary && <div className="mt-2 text-xs text-faint">Needs: {assetSummary}</div>}

      {clashes.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-[#33260f] px-2 py-1 text-xs text-warn">
          <AlertTriangle size={13} />
          Approving overlaps an existing booking in {clashes.join(', ')}.
        </div>
      )}

      {event.thread && event.thread.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-line pt-2">
          {event.thread.map((m) => (
            <div key={m.id} className="text-xs">
              <span className={cn('font-medium', m.fromRole === 'manager' ? 'text-info' : 'text-ink')}>
                {m.fromName}
              </span>{' '}
              <span className="text-muted">{m.body}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a note, a compromise, or a question…"
          className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-line-strong"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => onDecide('approve', message)}
            className="bg-ok hover:opacity-90"
          >
            <Check size={14} /> Accept
          </Button>
          <Button onClick={() => onDecide('deny', message)}>
            <X size={14} /> Decline
          </Button>
          <Button
            onClick={() => {
              onReply(message);
              setMessage('');
            }}
            disabled={!message.trim()}
          >
            <Send size={14} /> Reply only
          </Button>
        </div>
      </div>
    </div>
  );
}
