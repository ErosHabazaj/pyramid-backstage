import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import {
  Boxes,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  PencilLine,
  QrCode,
  Settings2,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/domain/types';
import { cn } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/roles';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/ui/Logo';

const REALTIME = {
  on: { color: '#1d9e75', label: 'Realtime on' },
  connecting: { color: '#ba7517', label: 'Connecting…' },
  off: { color: '#9a9a93', label: 'Local mode' },
} as const;

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  manager: [
    { to: '/', label: 'Command center', icon: LayoutDashboard, end: true },
    { to: '/proposals', label: 'Proposals', icon: ClipboardList },
    { to: '/inventory', label: 'Inventory', icon: Boxes },
    { to: '/manage', label: 'Manage venue', icon: Settings2 },
    { to: '/forecast', label: 'Forecast', icon: TrendingUp },
    { to: '/events', label: 'Events', icon: CalendarDays },
  ],
  organizer: [
    { to: '/propose', label: 'Propose an event', icon: PencilLine, end: true },
    { to: '/rooms', label: 'Browse rooms', icon: DoorOpen },
  ],
  attendee: [{ to: '/calendar', label: 'Event calendar', icon: CalendarDays, end: true }],
};

export function AppShell() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const realtimeStatus = useStore((s) => s.realtimeStatus);
  const pendingCount = useStore((s) => s.events.filter((e) => e.status === 'inquiry').length);
  const logout = useStore((s) => s.logout);

  if (!currentUser) return <Navigate to="/login" replace />;

  const rt = REALTIME[realtimeStatus];
  const nav = NAV_BY_ROLE[currentUser.role];

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r-2 border-ink bg-surface md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-surface shadow-[3px_3px_0_0_var(--color-ink)]">
            <Logo size={26} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-bold">Pyramid</div>
            <div className="text-[11px] font-semibold tracking-widest text-orange uppercase">Backstage</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md border-2 px-3 py-2 text-sm transition-all',
                  isActive
                    ? 'border-ink bg-orange/15 font-bold text-ink shadow-[2px_2px_0_0_var(--color-ink)]'
                    : 'border-transparent text-muted hover:border-ink/20 hover:bg-ink/5 hover:text-ink',
                )
              }
            >
              <Icon size={16} /> <span className="flex-1">{label}</span>
              {to === '/proposals' && pendingCount > 0 && (
                <span className="rounded-full border border-ink bg-info px-1.5 text-[11px] font-bold leading-tight text-white">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t-2 border-ink p-3">
          {currentUser.role === 'manager' && (
            <>
              <NavLink
                to="/scan"
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border-2 border-ink bg-surface px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_var(--color-ink)] transition-all hover:bg-surface-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--color-ink)]"
              >
                <QrCode size={15} /> Scan asset
              </NavLink>
              <div className="flex items-center gap-1.5 px-1 text-xs text-muted">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: rt.color }} />
                {rt.label}
              </div>
            </>
          )}

          <div className="flex items-center gap-2 rounded-md px-1 py-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-purple text-xs font-bold text-white">
              {currentUser.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-semibold">{currentUser.name}</div>
              <div className="text-[11px] text-faint">{ROLE_LABEL[currentUser.role]}</div>
            </div>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-5 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
