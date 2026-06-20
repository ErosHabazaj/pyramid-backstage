-- ── Pyramid Backstage — Supabase schema ──────────────────────────────
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Enables persistence + realtime for the QR asset-tracking hero.

create table if not exists public.asset_units (
  id text primary key,
  asset_type_id text not null,
  qr_code text not null unique,
  quantity integer not null,
  location_space_id text not null,
  status text not null check (
    status in ('available', 'reserved', 'in-transit', 'deployed', 'returned')
  ),
  reserved_for_event_id text
);

-- DEMO ONLY: allow the anon key full access. Tighten before production.
alter table public.asset_units enable row level security;
drop policy if exists "demo_all" on public.asset_units;
create policy "demo_all" on public.asset_units
  for all using (true) with check (true);

-- Realtime: emit the full row on updates, and add the table to the
-- realtime publication (idempotent).
alter table public.asset_units replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'asset_units'
  ) then
    alter publication supabase_realtime add table public.asset_units;
  end if;
end $$;

-- The app auto-seeds the cart rows on first load (when the table is empty),
-- so no manual INSERTs are needed.
