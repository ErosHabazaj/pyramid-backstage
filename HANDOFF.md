# Session handoff — Pyramid Backstage

_Last updated: 2026-06-20. Read alongside [CLAUDE.md](CLAUDE.md) (architecture) and [README.md](README.md) (run/setup)._

## TL;DR
A genuinely complete, demoable hackathon app for the Pyramid of Tirana: turn a
plain-language event request into a confirmed, conflict-checked, asset-reserved
operational plan, with a live 2.5D digital twin of the building. Builds clean,
runs on seed data with no keys. All 7 of the brief's success criteria are
covered, plus four differentiators (digital twin · live QR sync · detect-and-
**resolve** conflicts · predictive allocation). **Next planned task: a visual
overhaul.**

## What was built this session
1. **Scaffold** — Vite + React 19 + TS, Tailwind v4 (`@theme` tokens), zustand, router.
2. **Domain engines** (`src/domain/`, pure TS): the unified `Space` object model,
   capacity-from-area, conflict engine (space double-book + asset over-allocation
   sweep), status, geometry, planning (asset reqs + task lists), pricing (line-item
   quote + 20% VAT), forecast (peak-demand), resolutions (one-click fixes).
3. **Digital twin** — isometric `FloorStack` rendering rooms from data, status
   colors, deployed-asset dots, time scrubber.
4. **Floor 0** traced from the user's hand sketch (circular/radial): **Space 21**
   (big hall), **Box 14** (central hall), ring of **Box** breakout rooms, **Box 9**
   store, **Space 23 / Space 30** external pods. Areas calibrated to "Space 21 ≈ 125
   seated". Floor -1 not mapped yet.
5. **Intake funnel** — describe → match (with feasibility) → schedule → quote +
   proposal → confirm (creates event + reservation + 6-task plan + audit).
6. **QR asset tracking** — generate QR per cart, mobile scan view, relocate carts.
7. **Supabase Realtime** — `asset_units` synced; verified live cross-device (an
   external API write updated the open map with no reload).
8. **Conflict resolution** — alert chips are now one-click actions (trim / rent /
   shift / reassign) that mutate state and re-run the engine; verified clearing a
   conflict 1→0.
9. **Predictive allocation** — `/forecast` page: peak-demand risk, demand-over-day
   chart, transport-aware sourcing.
10. **AI intake** — `parse-intake` Gemini edge function (gemini-2.5-flash,
    thinking off, structured JSON) with offline `naiveParse` fallback.
11. **Moved to GitHub** — private repo `ErosHabazaj/pyramid-backstage`.

## Key decisions
- **AI = Gemini, not Claude** — user chose the free tier for cost. Key in Supabase
  secrets only.
- **2.5D isometric first**, true 3D only if ahead (not done).
- **Deterministic core, AI only for language** — conflicts/quotes/capacity never
  come from an LLM.
- **Hero feature = QR live tracking** (protected).

## Known gaps / TODO (prioritized)
1. **Visual overhaul** — the user's explicit next task. Structure/data are stable,
   so it's a styling pass (Tailwind tokens in `src/index.css`, component primitives
   in `src/components/ui/`).
2. **Deploy the edge function** — `parse-intake` is written but **not deployed**.
   Until then, intake uses the offline parser. Steps in README / below.
3. **Floor -1** — awaiting the user's next sketch; currently a "to be mapped" plate.
4. **Events are local-only** — confirmed events reset on reload (not persisted to
   Supabase). Same repo pattern as `asset_units` would fix it.
5. Optional: move proposal prose to an edge function (real Gemini/Claude call).

## Gotchas (will bite you if you don't know)
- `lucide-react` is **v1.21** (ESM, 5953 exports) — named imports are fine; ignore
  any instinct that it should be 0.x.
- Areas are **provisional** (no real dimensions). Everything scales off "Space 21 ≈
  125 theater". The brief's 180-pax example **doesn't fit floor 0** by design — the
  Intake `SAMPLE` is set to 100 so the happy path flows; typing 180 is a nice
  feasibility-rejection demo.
- **gemini-2.0-flash has 0 free quota** on this project (429). Use **gemini-2.5-flash**
  with `thinkingConfig.thinkingBudget: 0`. gemini-1.5-flash is retired (404).
- **Key hygiene:** the Gemini key was pasted in chat → consider regenerating in
  Google AI Studio. It must live ONLY in Supabase secrets, never in the repo or a
  `VITE_` var.
- Supabase project ref `wkcyfvfvccdejxqvliim`; anon key is public/safe; `.env.local`
  is gitignored (recreate on MacBook).
- Map is code-split: ScanView (html5-qrcode) and Forecast (recharts) are lazy chunks.

## Deploy the Gemini edge function (when ready)
```bash
brew install supabase/tap/supabase
cd pyramid-backstage
supabase init                 # ignore "already initialized"
supabase login
supabase link --project-ref wkcyfvfvccdejxqvliim
supabase secrets set GEMINI_API_KEY=<your_gemini_key>
supabase functions deploy parse-intake
```
Then Intake → Analyze shows an "AI parsed" badge.

## Demo script (maps to the brief's 7 criteria)
1. Intake: paste an event sentence → it becomes a structured request (1).
2. Match: engine ranks spaces with feasibility; breakouts show "too small" (2).
3. Quote + proposal generated (3).
4. Confirm → assets reserved, 6-task plan + audit created (4, 6).
5. Command center: remaining inventory + the live conflict alert (5).
6. Click a resolution chip → conflict clears, engine re-runs (5, differentiator).
7. Scan a QR on a phone → the twin updates on the big screen live (differentiator).
8. Close on the CEO quote: emails/spreadsheets/calls replaced by one screen (7).

## Suggested next-session starting point
Open Claude Code in the `pyramid-backstage` folder (CLAUDE.md auto-loads). Either:
- **Start the visual overhaul** (the planned task) — bring a reference/vibe; or
- **Deploy + test the edge function**, then move on; or
- **Add floor -1** when the sketch arrives.
