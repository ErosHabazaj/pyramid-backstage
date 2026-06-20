import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Supabase client (optional in dev) ────────────────────────────────
// The app runs entirely on seed data until you wire up Supabase. Set
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to enable
// persistence + realtime (the QR-scan-updates-the-map hero feature).

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
