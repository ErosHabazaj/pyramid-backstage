// ── Supabase Edge Function: parse-intake ─────────────────────────────
// Gemini-backed natural-language intake parser. Runs server-side so the
// GEMINI_API_KEY never reaches the browser. Returns structured event
// details; the client falls back to its offline parser if this fails.
//
// Deploy:  supabase functions deploy parse-intake
// Secret:  supabase secrets set GEMINI_API_KEY=your_key_here

const GEMINI_MODEL = 'gemini-2.5-flash';
const SETUP_STYLES = ['theater', 'banquet', 'classroom', 'cabaret', 'standing'];

const SYSTEM = `You extract structured event-booking details from a plain-language venue request.
Infer a short event title in title case (the event type, not the whole sentence).
Map the setup to exactly one of: theater, banquet, classroom, cabaret, standing.
Use banquet for seated dinners / round tables, standing for receptions / mixers / networking,
classroom for workshops / training / seminars, cabaret for lounge-style seating,
theater for conferences / talks / keynotes / presentations.
If headcount is missing, estimate 100.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') return json({ error: 'missing text' }, 400);

    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return json({ error: 'GEMINI_API_KEY not set' }, 500);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const body = {
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            headcount: { type: 'integer' },
            setupStyle: { type: 'string', enum: SETUP_STYLES },
          },
          required: ['title', 'headcount', 'setupStyle'],
        },
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return json({ error: 'gemini', detail: await r.text() }, 502);

    const data = await r.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = JSON.parse(rawText);

    // Validate / clamp before returning — never trust raw model output.
    const setupStyle = SETUP_STYLES.includes(parsed.setupStyle) ? parsed.setupStyle : 'theater';
    const headcount = Number.isFinite(parsed.headcount) ? Math.max(1, Math.round(parsed.headcount)) : 100;
    const title =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim().slice(0, 60)
        : 'New event request';

    return json({ title, headcount, setupStyle, confidence: 'ai' });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
