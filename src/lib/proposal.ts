import type {
  AssetRequirement,
  AssetType,
  SetupStyle,
  Space,
  TimeWindow,
} from '@/domain/types';
import { capacityFor, SETUP_LABEL } from '@/domain/capacity';
import type { Quote } from '@/domain/pricing';
import { formatEuro, formatTime } from '@/lib/utils';

// ── Proposal generator (Claude API stand-in) ─────────────────────────
// Deterministic, template-based prose so proposals work with no API key.
// To upgrade: call Claude (sonnet) from a Supabase Edge Function with the
// same inputs and return the text — numbers still come from the quote.

export interface ProposalInput {
  title: string;
  organizer: string;
  /** One or more rooms; combined capacity is summed across them. */
  spaces: Space[];
  setupStyle: SetupStyle;
  headcount: number;
  window: TimeWindow;
  quote: Quote;
  assetReqs: AssetRequirement[];
  assetTypes: AssetType[];
}

const FEATURE_PHRASES: Record<string, string> = {
  stage: 'a built-in stage',
  'av-rig': 'professional AV rigging',
  'step-free': 'step-free access',
  'natural-light': 'natural light',
  power: 'dedicated power',
};

export function generateProposalText(input: ProposalInput): string {
  const { title, organizer, spaces, setupStyle, headcount, window, quote } = input;
  const capacity = spaces.reduce((sum, s) => sum + capacityFor(s.areaM2, setupStyle), 0);
  const totalArea = spaces.reduce((sum, s) => sum + s.areaM2, 0);
  const floor = spaces[0].floor === 0 ? 'floor 0' : 'floor −1';
  const styleLabel = SETUP_LABEL[setupStyle].toLowerCase();
  const spaceNames = joinList(spaces.map((s) => s.name));
  const multi = spaces.length > 1;

  const features = [...new Set(spaces.flatMap((s) => s.features))]
    .map((f) => FEATURE_PHRASES[f])
    .filter(Boolean);
  const featureSentence = features.length
    ? ` ${multi ? 'They offer' : 'It offers'} ${joinList(features)}.`
    : '';

  const keyAssets = input.assetReqs
    .map((r) => {
      const at = input.assetTypes.find((t) => t.id === r.assetTypeId);
      return at ? `${r.quantity} ${at.label.toLowerCase()}` : null;
    })
    .filter(Boolean)
    .slice(0, 4) as string[];

  return [
    `Proposal — ${title}`,
    ``,
    `Dear ${organizer},`,
    ``,
    `Thank you for considering the Pyramid of Tirana for ${title}. Based on your`,
    `requirements — ${headcount} guests, ${styleLabel} setup — we are pleased to`,
    `propose the following.`,
    ``,
    multi ? `RECOMMENDED SPACES` : `RECOMMENDED SPACE`,
    `${spaceNames} (${floor}) — ${totalArea} m²${multi ? ' combined' : ''}, comfortably`,
    `accommodating ${capacity} guests in a ${styleLabel} configuration.${featureSentence}`,
    ``,
    `WHAT'S INCLUDED`,
    `· ${SETUP_LABEL[setupStyle]} setup for ${headcount} guests`,
    `· ${joinList(keyAssets)}`,
    `· Full setup and teardown by our operations team`,
    `· On-site technical support and cleaning`,
    ``,
    `SCHEDULE`,
    `· Setup from ${formatTime(window.setupStart)}`,
    `· Event ${formatTime(window.start)} – ${formatTime(window.end)}`,
    `· Teardown complete by ${formatTime(window.teardownEnd)}`,
    ``,
    `INVESTMENT`,
    `${formatEuro(quote.total)} total, including ${formatEuro(quote.vat)} VAT.`,
    `A full line-item breakdown is shown alongside this proposal.`,
    ``,
    `To confirm, simply approve this proposal — we will reserve ${spaceNames} and all`,
    `equipment immediately and generate your operational plan.`,
    ``,
    `Warm regards,`,
    `Pyramid of Tirana — Events & Operations`,
  ].join('\n');
}

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
