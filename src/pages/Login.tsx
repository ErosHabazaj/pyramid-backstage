import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@/domain/types';
import { signIn, signUp } from '@/lib/auth';
import { ROLE_BLURB, ROLE_LABEL, homeFor } from '@/lib/roles';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/primitives';
import { Logo } from '@/components/ui/Logo';
import { Intro } from '@/components/Intro';
import { cn } from '@/lib/utils';

const ROLES: Role[] = ['organizer', 'attendee', 'manager'];
const INTRO_KEY = 'pb.introSeen';

function introAlreadySeen() {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}
function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function Login() {
  const currentUser = useStore((s) => s.currentUser);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('organizer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIntro] = useState(() => {
    // `?intro` forces the intro every time — handy for previewing.
    const forced = typeof window !== 'undefined' && /(\?|&|#)intro\b/.test(window.location.search + window.location.hash);
    return forced || (!introAlreadySeen() && !prefersReducedMotion());
  });

  if (currentUser) return <Navigate to={homeFor(currentUser.role)} replace />;

  function markIntroSeen() {
    try {
      localStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* storage unavailable */
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } =
      mode === 'signup' ? await signUp(email, password, name.trim(), role) : await signIn(email, password);
    if (error) {
      setError(error);
      setBusy(false);
    }
    // success → onAuthStateChange sets currentUser → redirect above.
  }

  const panel = (
      <div className="glass-strong w-full max-w-sm rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-ink bg-surface shadow-[3px_3px_0_0_var(--color-ink)]">
            <Logo size={28} />
          </div>
          <div className="leading-tight">
            <div className="text-base font-medium">Theta</div>
            <div className="text-sm text-muted">{mode === 'login' ? 'Log in to continue' : 'Create your account'}</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <label className="block text-xs text-muted">
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name or organization"
                className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-line-strong"
              />
            </label>
          )}

          <label className="block text-xs text-muted">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-line-strong"
            />
          </label>

          <label className="block text-xs text-muted">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-line-strong"
            />
          </label>

          {mode === 'signup' && (
            <div>
              <div className="mb-1 text-xs text-muted">I am a…</div>
              <div className="grid grid-cols-3 gap-1.5">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={role === r}
                    onClick={() => setRole(r)}
                    className={cn(
                      'cursor-pointer rounded-md border-2 px-2 py-1.5 text-xs font-semibold transition-all',
                      role === r
                        ? 'border-ink bg-orange/15 text-orange-ink shadow-[2px_2px_0_0_var(--color-ink)]'
                        : 'border-ink/25 hover:bg-surface-2',
                    )}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-faint">{ROLE_BLURB[role]}</p>
            </div>
          )}

          {error && (
            <div className="rounded-md border-[1.5px] border-danger/40 bg-[#fbe2e2] px-3 py-2 text-xs font-medium text-danger">{error}</div>
          )}

          <Button type="submit" variant="primary" disabled={busy} className="w-full justify-center">
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="cursor-pointer font-medium text-info underline-offset-2 hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
  );

  if (showIntro) return <Intro onReached={markIntroSeen}>{panel}</Intro>;
  return <div className="flex min-h-dvh items-center justify-center px-5 py-10">{panel}</div>;
}
