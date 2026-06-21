import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Role, User } from '@/domain/types';
import { supabase } from '@/lib/supabase';

// ── Auth (Supabase email + password) ─────────────────────────────────
// Credentials live in Supabase auth.users; name + role ride in user
// metadata (and are mirrored to public.profiles by a DB trigger).

const NO_AUTH = 'Accounts need Supabase — set VITE_SUPABASE_URL + anon key in .env.local.';

/** Build the app User from a Supabase session user (metadata-driven). */
export function mapSessionUser(u: SupabaseUser): User {
  const meta = (u.user_metadata ?? {}) as { name?: string; role?: Role };
  return {
    id: u.id,
    name: meta.name || u.email?.split('@')[0] || 'User',
    role: meta.role ?? 'attendee',
  };
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  role: Role,
): Promise<{ error?: string }> {
  if (!supabase) return { error: NO_AUTH };
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } },
  });
  return { error: error?.message };
}

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  if (!supabase) return { error: NO_AUTH };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
