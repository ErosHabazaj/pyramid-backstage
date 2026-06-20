import type { SetupStyle } from '@/domain/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// ── Intake parsing ───────────────────────────────────────────────────
// Primary path: a Gemini call inside the `parse-intake` Supabase Edge
// Function (key stays server-side). Fallback: the offline regex parser
// below, so request→match works even with no function deployed / no network.

export interface ParsedRequest {
  title: string;
  headcount: number;
  setupStyle: SetupStyle;
  confidence: 'ai' | 'parsed' | 'guessed';
}

const SETUP_STYLES: SetupStyle[] = ['theater', 'banquet', 'classroom', 'cabaret', 'standing'];

/** AI parse via the Edge Function, falling back to the offline parser. */
export async function parseIntake(text: string): Promise<ParsedRequest> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('parse-intake', {
        body: { text },
      });
      if (
        !error &&
        data &&
        typeof data.headcount === 'number' &&
        SETUP_STYLES.includes(data.setupStyle)
      ) {
        return {
          title: typeof data.title === 'string' && data.title.trim() ? data.title : 'New event request',
          headcount: Math.max(1, Math.round(data.headcount)),
          setupStyle: data.setupStyle as SetupStyle,
          confidence: 'ai',
        };
      }
    } catch {
      /* fall through to the offline parser */
    }
  }
  return naiveParse(text);
}

const SETUP_HINTS: Array<[RegExp, SetupStyle]> = [
  [/dinner|gala|banquet|awards|wedding/i, 'banquet'],
  [/workshop|training|class|course|seminar/i, 'classroom'],
  [/reception|mixer|networking|standing|cocktail|launch party/i, 'standing'],
  [/cabaret|lounge/i, 'cabaret'],
  [/conference|summit|keynote|talk|presentation|panel|lecture|theat/i, 'theater'],
];

export function naiveParse(text: string): ParsedRequest {
  const headMatch = text.match(/(\d{2,5})\s*(?:people|pax|guests?|persons?|attendees|seats)?/i);
  const headcount = headMatch ? parseInt(headMatch[1], 10) : 100;

  let setupStyle: SetupStyle = 'theater';
  let matched = false;
  for (const [re, style] of SETUP_HINTS) {
    if (re.test(text)) {
      setupStyle = style;
      matched = true;
      break;
    }
  }

  // Title = the event-type phrase before "for / with / , / ." e.g.
  // "Startup conference for 100 people…" → "Startup conference".
  const trimmed = text.trim();
  const titleMatch = trimmed.match(/^(.*?)(?:\s+for\b|\s+with\b|[,.\n]).*/i);
  const title = (titleMatch ? titleMatch[1] : trimmed).trim().slice(0, 50) || 'New event request';

  return {
    title,
    headcount,
    setupStyle,
    confidence: headMatch && matched ? 'parsed' : 'guessed',
  };
}
