# Pyramid Backstage

Event-operations platform for the Pyramid of Tirana — JunctionX Tirana 2026 (AADF challenge).
Turns a plain-language event request into a confirmed, conflict-checked, asset-reserved
operational plan, with a live 2.5D digital twin of the building.

## Stack

- **Vite + React 19 + TypeScript**, Tailwind v4, Framer Motion, React Router
- **Supabase** (Postgres + Auth + Realtime + Storage) — optional in dev
- **Gemini** (gemini-2.5-flash) for natural-language intake, via a Supabase Edge Function (key server-side); offline parser fallback
- **html5-qrcode / qrcode** for the asset-tracking hero feature

## Run

```bash
npm install
npm run dev
```

The app boots on **seed data** — no backend or API keys required. Add `.env.local`
(see `.env.example`) to enable Supabase persistence and realtime.

## Enable realtime (cross-device QR sync)

The sidebar shows **Local mode** until Supabase is connected. To turn on the
"scan on a phone → the big-screen map updates live" demo:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard: **SQL → New query**, paste `supabase/schema.sql`, run it.
3. Copy **Project URL** and **anon public key** (Settings → API) into `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. Restart `npm run dev`. The app auto-seeds the carts on first load, the badge
   flips to **Realtime on**, and a QR scan on any device updates every open map.

Only `asset_units` is synced today (what scans mutate); events/reservations can
follow the exact same repo + subscribe pattern in `src/lib/assetUnitsRepo.ts`.

## Architecture principle

**AI handles words; deterministic code handles decisions.** Availability, conflicts
and allocation are computed in plain TypeScript (`src/domain/`) so the demo can never
hallucinate a booking. Claude is used only for language-in (intake parsing) and
language-out (proposals, copilot).

## Layout

```
src/
  domain/        the spine — pure, testable logic
    types.ts       the unified "space object" model + all entities
    capacity.ts    area → capacity-per-setup + space matching
    conflicts.ts   space double-booking + asset over-allocation engine
    status.ts      live space status at a given hour
    geometry.ts    plan-coordinate helpers (octagon footprints)
  data/seed.ts   placeholder Pyramid (floors 0 & -1) + inventory + events
  store/         zustand app state
  components/
    map/           isometric projection + FloorStack (the digital twin)
    ui/            flat UI primitives
    layout/        AppShell + nav
  pages/         CommandCenter, Intake, Inventory, EventsList
  lib/           supabase client, intake parser, utils
```

## The "space object"

One record per room (`src/domain/types.ts` → `Space`) does triple duty:
map geometry (`footprint`), bookable venue, and capacity source (`areaM2`).
Define a room once; the map, the matching engine and the capacity math stay in sync.

> Geometry in `seed.ts` is **placeholder** (procedural octagon quadrants) until the
> real venue sketch is traced. Replace `footprint` + `areaM2` per space and everything
> downstream updates automatically.

## Next up

- [x] Floor 0 traced from the venue sketch (radial layout)
- [x] QR scan view (mobile) → live map update
- [x] Supabase realtime for `asset_units` (cross-device sync)
- [x] Quotation + proposal generation → intake flow creates a full event plan
- [x] Conflict one-click resolution (apply fix → engine re-runs → clears)
- [x] Predictive allocation: peak-demand forecast, shortfall risk, transport-aware sourcing
- [x] AI intake parsing via Gemini Edge Function (`supabase/functions/parse-intake`) + offline fallback
- [ ] Visual overhaul (planned)
- [ ] Trace floor -1 from the next sketch
- [ ] Optionally move proposal prose to the same Edge Function pattern
- [ ] Persist events/reservations to Supabase (same pattern as units)
```
