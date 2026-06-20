# Pyramid Backstage — project context for Claude Code

Event-operations platform for the **Pyramid of Tirana** — JunctionX Tirana 2026
hackathon (AADF challenge). Turns a plain-language event request into a
confirmed, conflict-checked, asset-reserved operational plan, with a live 2.5D
digital twin of the building.

## Run it
```bash
npm install
npm run dev        # http://localhost:5173 — boots on seed data, no keys needed
npm run build      # tsc -b && vite build (keep this green)
```

## Stack
Vite + React 19 + TypeScript · Tailwind v4 (`@theme` tokens in `src/index.css`) ·
zustand · React Router · Supabase (Postgres + Realtime) · Recharts ·
html5-qrcode + qrcode · lucide-react (note: **v1.21**, ESM, named imports fine).

## Architecture principle (important)
**AI handles words; deterministic code handles decisions.** Availability,
capacity, conflicts, allocation, pricing all live in pure TS under `src/domain/`
and must never come from an LLM. AI is only used for language-in (intake
parsing) and language-out (proposals).

## Layout
```
src/domain/      pure logic: types, capacity, conflicts, status, geometry,
                 planning, pricing, forecast, resolutions
src/data/seed.ts seed venue (floor 0 from the user's sketch) + inventory + events
src/store/       zustand store (useStore)
src/components/  map/ (isometric FloorStack), ui/ (primitives, QrThumb), layout/
src/pages/       CommandCenter, Intake, Inventory, Forecast, EventsList, ScanView
src/lib/         supabase client, intake parser, proposal generator, utils
supabase/functions/parse-intake/   Gemini edge function (intake parsing)
supabase/schema.sql                asset_units table + realtime
```

## The "space object"
One record per room (`src/domain/types.ts` → `Space`) is map geometry +
bookable venue + capacity source. Define a room once; map, matching, and
capacity stay in sync. Capacity is derived from `areaM2` via event-planning
densities (`src/domain/capacity.ts`).

## Current state (what's done)
- Floor 0 traced from the user's hand sketch (circular/radial: Space 21 big
  hall, Box 14 central hall, ring of Box breakout rooms, Box 9 store, Space 23 /
  Space 30 external pods). Areas calibrated to "Space 21 ≈ 125 seated".
  **Floor -1 is NOT mapped yet** (renders a "to be mapped" plate).
- Digital twin (isometric), conflict engine, one-click conflict resolution,
  predictive allocation forecast page, capacity-from-area.
- Intake → match (feasibility) → quote → proposal → confirm (creates event +
  reservation + tasks + audit). Confirmed events are **local-only** (not yet
  persisted to Supabase).
- QR scan view + live cross-device sync via Supabase Realtime (`asset_units`).
- AI intake parsing via the `parse-intake` Gemini edge function, with the
  offline `naiveParse` as fallback.

## External services
- **Supabase** project ref `wkcyfvfvccdejxqvliim`. Needs `.env.local` with
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (anon key is public/safe).
  Realtime + the edge function require it; without it the app uses seed data.
- **Gemini** key lives ONLY in Supabase secrets (`GEMINI_API_KEY`), never in the
  repo. Edge function uses `gemini-2.5-flash` with `thinkingBudget: 0`.

## Next up
- **Visual overhaul** (planned by the user — styling/polish pass).
- Trace floor -1 from the next sketch.
- Optionally persist events/reservations to Supabase; move proposal prose to an
  edge function.

## After cloning on a new machine
1. `npm install`
2. Create `.env.local` (Supabase URL + anon key) — see `.env.example`.
3. The Gemini key is already in Supabase secrets (cloud), so AI intake works
   once `.env.local` is set and the edge function is deployed.
