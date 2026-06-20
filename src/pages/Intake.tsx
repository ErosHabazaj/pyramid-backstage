import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wand2 } from 'lucide-react';
import { parseIntake, type ParsedRequest } from '@/lib/intake';
import { matchSpaces, SETUP_LABEL } from '@/domain/capacity';
import { deriveAssetReqs } from '@/domain/planning';
import { generateQuote } from '@/domain/pricing';
import { generateProposalText } from '@/lib/proposal';
import type { TimeWindow } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { Badge, Button, Card, SectionLabel } from '@/components/ui/primitives';
import { QuoteProposal } from '@/components/QuoteProposal';

const SAMPLE = 'Startup conference for 100 people next month, with a stage and projector.';
const pad = (n: number) => String(n).padStart(2, '0');
const today = new Date().toISOString().slice(0, 10);

function buildWindow(date: string, startH: number, hours: number): TimeWindow {
  const t = (h: number) => `${date}T${pad(Math.max(0, Math.min(23, h)))}:00:00`;
  return {
    setupStart: t(startH - 2),
    start: t(startH),
    end: t(startH + hours),
    teardownEnd: t(startH + hours + 1),
  };
}

export function Intake() {
  const navigate = useNavigate();
  const { spaces, assetTypes, createEvent } = useStore();

  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedRequest | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [organizer, setOrganizer] = useState('');
  const [date, setDate] = useState(today);
  const [startH, setStartH] = useState(14);
  const [hours, setHours] = useState(4);

  const matches = parsed ? matchSpaces(spaces, parsed.headcount, parsed.setupStyle).slice(0, 4) : [];
  const chosen = chosenId ? spaces.find((s) => s.id === chosenId) ?? null : null;

  async function analyze() {
    setAnalyzing(true);
    setChosenId(null);
    try {
      setParsed(await parseIntake(text || SAMPLE));
    } finally {
      setAnalyzing(false);
    }
  }

  // Quote + proposal for the chosen space
  const assetReqs = parsed ? deriveAssetReqs(parsed.headcount, parsed.setupStyle) : [];
  let quote = null;
  let proposalText = '';
  let eventWindow: TimeWindow | null = null;
  if (parsed && chosen) {
    eventWindow = buildWindow(date, startH, hours);
    quote = generateQuote({
      space: chosen,
      setupStyle: parsed.setupStyle,
      headcount: parsed.headcount,
      hours,
      assetReqs,
      assetTypes,
    });
    proposalText = generateProposalText({
      title: parsed.title,
      organizer: organizer || 'Prospective client',
      space: chosen,
      setupStyle: parsed.setupStyle,
      headcount: parsed.headcount,
      window: eventWindow,
      quote,
      assetReqs,
      assetTypes,
    });
  }

  function confirm() {
    if (!parsed || !chosen || !eventWindow) return;
    createEvent({
      title: parsed.title,
      organizer: organizer || 'Prospective client',
      headcount: parsed.headcount,
      setupStyle: parsed.setupStyle,
      spaceId: chosen.id,
      window: eventWindow,
      assetReqs,
    });
    navigate('/events');
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium">Request intake</h1>
        <p className="text-sm text-muted">
          Describe an event in plain language → match a space → quote, proposal, and a confirmed plan.
        </p>
      </div>

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
          <button onClick={() => setText(SAMPLE)} className="text-xs text-muted underline-offset-2 hover:underline">
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
          <div className="space-y-2">
            {matches.map((m) => (
              <div
                key={m.space.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${m.space.id === chosenId ? 'border-info' : 'border-line'}`}
              >
                <div>
                  <div className="text-sm font-medium">{m.space.name}</div>
                  <div className="text-xs text-muted">
                    {m.space.floor === 0 ? 'Floor 0' : 'Floor −1'} · {m.space.areaM2} m² · holds {m.capacity} at{' '}
                    {SETUP_LABEL[parsed.setupStyle].toLowerCase()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={m.fits ? 'ok' : 'danger'}>
                    {m.fits ? `${Math.round(m.utilization * 100)}% full` : 'too small'}
                  </Badge>
                  <Button onClick={() => setChosenId(m.space.id)} disabled={!m.fits}>
                    {m.space.id === chosenId ? 'Selected' : 'Select'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {parsed && chosen && (
        <Card className="p-4">
          <SectionLabel>3 · Schedule</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-xs text-muted">
              Organizer
              <input
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="Client name"
                className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-line-strong"
              />
            </label>
            <label className="text-xs text-muted">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-line-strong"
              />
            </label>
            <label className="text-xs text-muted">
              Start (hour)
              <input
                type="number"
                min={8}
                max={20}
                value={startH}
                onChange={(e) => setStartH(parseInt(e.target.value || '14', 10))}
                className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-line-strong"
              />
            </label>
            <label className="text-xs text-muted">
              Duration (h)
              <input
                type="number"
                min={1}
                max={12}
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value || '4', 10))}
                className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-line-strong"
              />
            </label>
          </div>
        </Card>
      )}

      {quote && proposalText && (
        <QuoteProposal quote={quote} proposalText={proposalText} onConfirm={confirm} confirmLabel="Confirm & reserve" />
      )}
    </div>
  );
}
