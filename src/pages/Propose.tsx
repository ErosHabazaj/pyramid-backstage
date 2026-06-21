import { useState } from 'react';
import { Send, Sparkles, Wand2 } from 'lucide-react';
import { parseIntake, type ParsedRequest } from '@/lib/intake';
import { capacityFor, isDiningSetup, matchSpaces, SETUP_LABEL } from '@/domain/capacity';
import { deriveAssetReqs } from '@/domain/planning';
import { generateQuote } from '@/domain/pricing';
import { generateProposalText } from '@/lib/proposal';
import type { EventRequest, Space, TimeWindow } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { Badge, Button, Card, SectionLabel } from '@/components/ui/primitives';
import { Calendar } from '@/components/ui/Calendar';
import { QuoteProposal } from '@/components/QuoteProposal';
import { cn, formatTime, prettyDate, ymd } from '@/lib/utils';

const SAMPLE = 'Startup conference for 100 people next month, with a stage and projector.';
const pad = (n: number) => String(n).padStart(2, '0');
const START_HOURS = [9, 11, 13, 15, 17, 19];
const DURATIONS = [2, 3, 4, 6];

function buildWindow(date: string, startH: number, hours: number): TimeWindow {
  const t = (h: number) => `${date}T${pad(Math.max(0, Math.min(23, h)))}:00:00`;
  return {
    setupStart: t(startH - 2),
    start: t(startH),
    end: t(startH + hours),
    teardownEnd: t(startH + hours + 1),
  };
}

const STATUS_TONE = {
  inquiry: 'warn',
  confirmed: 'ok',
  cancelled: 'danger',
} as const;

const STATUS_LABEL: Record<string, string> = {
  inquiry: 'Awaiting review',
  confirmed: 'Approved',
  cancelled: 'Declined',
};

export function Propose() {
  const { spaces, assetTypes, currentUser, submitProposal, replyProposal, events } = useStore();

  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedRequest | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [chosenIds, setChosenIds] = useState<string[]>([]);
  const [date, setDate] = useState(ymd(new Date()));
  const [startH, setStartH] = useState(15);
  const [hours, setHours] = useState(4);
  const [message, setMessage] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  if (!currentUser) return null;

  const matches = parsed ? matchSpaces(spaces, parsed.headcount, parsed.setupStyle).slice(0, 5) : [];
  const dining = parsed ? isDiningSetup(parsed.setupStyle) : false;
  const chosenSpaces: Space[] = chosenIds
    .map((id) => spaces.find((s) => s.id === id))
    .filter((s): s is Space => Boolean(s));
  const combinedCapacity =
    parsed ? chosenSpaces.reduce((sum, s) => sum + capacityFor(s.areaM2, parsed.setupStyle), 0) : 0;
  const combinedFits = parsed ? combinedCapacity >= parsed.headcount : false;

  const myProposals = events
    .filter((e) => e.organizerId === currentUser.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function toggleSpace(id: string) {
    setChosenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function analyze() {
    setAnalyzing(true);
    setChosenIds([]);
    setSubmittedId(null);
    try {
      setParsed(await parseIntake(text || SAMPLE));
    } finally {
      setAnalyzing(false);
    }
  }

  const assetReqs = parsed ? deriveAssetReqs(parsed.headcount, parsed.setupStyle) : [];
  const eventWindow = parsed && chosenSpaces.length ? buildWindow(date, startH, hours) : null;
  let quote = null;
  let proposalText = '';
  if (parsed && chosenSpaces.length && eventWindow) {
    quote = generateQuote({
      spaces: chosenSpaces,
      setupStyle: parsed.setupStyle,
      headcount: parsed.headcount,
      hours,
      assetReqs,
      assetTypes,
    });
    proposalText = generateProposalText({
      title: parsed.title,
      organizer: currentUser.name,
      spaces: chosenSpaces,
      setupStyle: parsed.setupStyle,
      headcount: parsed.headcount,
      window: eventWindow,
      quote,
      assetReqs,
      assetTypes,
    });
  }

  function submit() {
    if (!parsed || !chosenSpaces.length || !eventWindow) return;
    const id = submitProposal({
      title: parsed.title,
      organizer: currentUser!.name,
      organizerId: currentUser!.id,
      headcount: parsed.headcount,
      setupStyle: parsed.setupStyle,
      spaceIds: chosenSpaces.map((s) => s.id),
      window: eventWindow,
      assetReqs,
      message,
    });
    setSubmittedId(id);
    setParsed(null);
    setChosenIds([]);
    setText('');
    setMessage('');
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium">Propose an event</h1>
        <p className="text-sm text-muted">
          Describe it, pick rooms and a date, then submit for the Pyramid team to review.
        </p>
      </div>

      {submittedId && (
        <Card className="flex items-center gap-2 border-info p-3 text-sm">
          <Badge tone="ok">Submitted</Badge>
          Your proposal was sent for review. Track its status below.
        </Card>
      )}

      <Card className="p-4">
        <SectionLabel>1 · Describe the event</SectionLabel>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={SAMPLE}
          className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-line-strong"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button variant="primary" onClick={analyze} disabled={analyzing}>
            <Wand2 size={15} /> {analyzing ? 'Analyzing…' : 'Analyze'}
          </Button>
          <button
            onClick={() => setText(SAMPLE)}
            className="cursor-pointer text-xs text-muted underline-offset-2 hover:underline"
          >
            use the brief’s example
          </button>
          <span className="ml-auto flex items-center gap-1 text-xs text-faint">
            <Sparkles size={12} /> Gemini · offline fallback
          </span>
        </div>
      </Card>

      {parsed && (
        <Card className="p-4">
          <SectionLabel>2 · Matched spaces</SectionLabel>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="info">{parsed.headcount} people</Badge>
            <Badge tone="neutral">{SETUP_LABEL[parsed.setupStyle]}</Badge>
            <Badge tone={parsed.confidence === 'ai' ? 'info' : parsed.confidence === 'parsed' ? 'ok' : 'warn'}>
              {parsed.confidence === 'ai' ? 'AI parsed' : parsed.confidence}
            </Badge>
          </div>
          <p className="mb-3 text-xs text-muted">
            {dining
              ? 'Dinners are seated in Space areas — Box rooms are shown but can’t be added. Combine rooms for larger parties.'
              : 'Add one or more rooms — capacities combine for larger events.'}
          </p>
          <div className="space-y-2">
            {matches.map((m) => {
              const selected = chosenIds.includes(m.space.id);
              const blocked = dining && m.isBox;
              return (
                <div
                  key={m.space.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3',
                    selected ? 'border-info' : 'border-line',
                    blocked && 'opacity-55',
                  )}
                >
                  <div>
                    <div className="text-sm font-medium">{m.space.name}</div>
                    <div className="text-xs text-muted">
                      {m.space.floor === 0 ? 'Floor 0' : 'Floor −1'} · {m.space.areaM2} m² · holds {m.capacity} at{' '}
                      {SETUP_LABEL[parsed.setupStyle].toLowerCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {blocked ? (
                      <Badge tone="neutral">Box area</Badge>
                    ) : (
                      <Badge tone={m.fits ? 'ok' : 'warn'}>
                        {m.fits ? `${Math.round(m.utilization * 100)}% full` : 'add to combine'}
                      </Badge>
                    )}
                    <Button
                      variant={selected ? 'primary' : 'default'}
                      onClick={() => toggleSpace(m.space.id)}
                      disabled={blocked}
                      title={blocked ? 'Box rooms aren’t used for seated dinners' : undefined}
                    >
                      {selected ? 'Added' : 'Add'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {chosenSpaces.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm">
              <span>
                <span className="text-muted">Selected: </span>
                <span className="font-medium">{chosenSpaces.map((s) => s.name).join(' + ')}</span>
                <span className="text-muted"> · holds {combinedCapacity} combined</span>
              </span>
              <Badge tone={combinedFits ? 'ok' : 'danger'}>
                {combinedFits
                  ? `fits ${parsed.headcount} (${Math.round((parsed.headcount / combinedCapacity) * 100)}% full)`
                  : `short ${parsed.headcount - combinedCapacity}`}
              </Badge>
            </div>
          )}
        </Card>
      )}

      {parsed && chosenSpaces.length > 0 && (
        <Card className="p-4">
          <SectionLabel>3 · Pick a date &amp; time</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Calendar selected={date} onSelect={setDate} minDay={ymd(new Date())} />
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 text-xs text-muted">Start time</div>
                <div className="flex flex-wrap gap-1.5">
                  {START_HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setStartH(h)}
                      className={cn(
                        'cursor-pointer rounded-md border px-2.5 py-1 text-sm transition-colors',
                        startH === h ? 'border-info bg-hall-blue text-info' : 'border-line hover:bg-surface-2',
                      )}
                    >
                      {pad(h)}:00
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-muted">Duration</div>
                <div className="flex flex-wrap gap-1.5">
                  {DURATIONS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(h)}
                      className={cn(
                        'cursor-pointer rounded-md border px-2.5 py-1 text-sm transition-colors',
                        hours === h ? 'border-info bg-hall-blue text-info' : 'border-line hover:bg-surface-2',
                      )}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="text-muted">Scheduled: </span>
                <span className="font-medium">{prettyDate(date)}</span>
                <span className="text-muted">
                  {' '}
                  · {pad(startH)}:00–{pad(Math.min(23, startH + hours))}:00
                </span>
              </div>
              <label className="block text-xs text-muted">
                Note to the review team <span className="text-faint">(optional)</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Anything the Pyramid team should know…"
                  className="mt-1 w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-line-strong"
                />
              </label>
            </div>
          </div>
        </Card>
      )}

      {quote && proposalText && (
        <QuoteProposal quote={quote} proposalText={proposalText} onConfirm={submit} confirmLabel="Submit for approval" />
      )}

      <Card className="p-4">
        <SectionLabel>Your proposals</SectionLabel>
        {myProposals.length === 0 ? (
          <p className="text-sm text-muted">No proposals yet. Describe an event above to get started.</p>
        ) : (
          <div className="space-y-2">
            {myProposals.map((e) => (
              <ProposalRow key={e.id} event={e} spaces={spaces} onReply={(body) => replyProposal(e.id, body)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ProposalRow({
  event,
  spaces,
  onReply,
}: {
  event: EventRequest;
  spaces: Space[];
  onReply: (body: string) => void;
}) {
  const [reply, setReply] = useState('');
  const rooms = (event.spaceIds ?? (event.spaceId ? [event.spaceId] : []))
    .map((id) => spaces.find((s) => s.id === id)?.name)
    .filter(Boolean)
    .join(' + ');
  const tone = STATUS_TONE[event.status as keyof typeof STATUS_TONE] ?? 'neutral';

  function send() {
    if (!reply.trim()) return;
    onReply(reply);
    setReply('');
  }

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{event.title}</div>
          <div className="text-xs text-muted">
            {rooms} · {prettyDate(event.window.start.slice(0, 10))} · {formatTime(event.window.start)}–
            {formatTime(event.window.end)} · {event.headcount} pax
          </div>
        </div>
        <Badge tone={tone}>{STATUS_LABEL[event.status] ?? event.status}</Badge>
      </div>

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

      {event.status === 'inquiry' && (
        <div className="mt-2 flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Reply to the review team…"
            className="flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-line-strong"
          />
          <Button onClick={send} disabled={!reply.trim()}>
            <Send size={14} /> Send
          </Button>
        </div>
      )}
    </div>
  );
}
