-- ── Theta — Supabase schema ────────────────────────────────────────
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

-- ── Accounts: profiles (role + name per auth user) ────────────────────
-- Supabase Auth holds the credentials in auth.users; this table holds the
-- app-level role and display name, created automatically from the signup
-- metadata by the trigger below.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('manager', 'organizer', 'attendee')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

-- On signup, copy name + role from the user metadata into a profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'attendee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
