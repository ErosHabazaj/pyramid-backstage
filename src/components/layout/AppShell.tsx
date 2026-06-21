import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Boxes,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  PencilLine,
  QrCode,
  Settings2,
  TrendingUp,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/domain/types';
import { cn } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/roles';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/ui/Logo';

const REALTIME = {
  on: { color: '#9caf2c', label: 'Realtime on' },
  connecting: { color: '#e8531e', label: 'Connecting…' },
  off: { color: '#9a9082', label: 'Local mode' },
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
  const location = useLocation();
  const currentUser = useStore((s) => s.currentUser);
  const realtimeStatus = useStore((s) => s.realtimeStatus);
  const pendingCount = useStore((s) => s.events.filter((e) => e.status === 'inquiry').length);
  const logout = useStore((s) => s.logout);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // close the mobile drawer on route change + lock body scroll while open
  useEffect(() => setDrawerOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  if (!currentUser) return <Navigate to="/login" replace />;

  const rt = REALTIME[realtimeStatus];
  const nav = NAV_BY_ROLE[currentUser.role];

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-surface shadow-[3px_3px_0_0_var(--color-ink)]">
        <Logo size={26} />
      </div>
      <div className="leading-tight">
        <div className="font-display text-base font-bold">Theta</div>
        <div className="text-[11px] font-semibold tracking-widest text-orange uppercase">Event ops</div>
      </div>
    </div>
  );

  const navLinks = (
    <nav className="flex-1 space-y-1 px-2 py-2">
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md border-2 px-3 py-2.5 text-sm transition-all md:py-2',
              isActive
                ? 'border-ink bg-orange/15 font-bold text-ink shadow-[2px_2px_0_0_var(--color-ink)]'
                : 'border-transparent text-muted hover:border-ink/20 hover:bg-ink/5 hover:text-ink',
            )
          }
        >
          <Icon size={18} /> <span className="flex-1">{label}</span>
          {to === '/proposals' && pendingCount > 0 && (
            <span className="rounded-full border border-ink bg-info px-1.5 text-[11px] font-bold leading-tight text-white">
              {pendingCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-2 border-t-2 border-ink p-3">
      {currentUser.role === 'manager' && (
        <>
          <NavLink
            to="/scan"
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border-2 border-ink bg-surface px-3 py-2.5 text-sm font-semibold shadow-[3px_3px_0_0_var(--color-ink)] transition-all hover:bg-surface-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--color-ink)] md:py-2"
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-purple text-xs font-bold text-white">
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
          className="cursor-pointer rounded-md p-2 text-muted transition-colors hover:bg-ink/5 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      {/* desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r-2 border-ink bg-surface md:flex">
        <div className="px-4 py-4">{brand}</div>
        {navLinks}
        {footer}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-ink bg-surface px-4 py-3 md:hidden"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          {brand}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border-2 border-ink bg-surface shadow-[3px_3px_0_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--color-ink)]"
          >
            <Menu size={20} />
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-info px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden">
          <div
            className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-6"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="anim-fade absolute inset-0 bg-ink/50"
          />
          <div
            className="anim-slide-in absolute top-0 right-0 flex h-full w-[82%] max-w-xs flex-col border-l-2 border-ink bg-surface shadow-[-8px_0_0_0_rgba(26,21,18,0.12)]"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="flex items-center justify-between px-4 py-4">
              {brand}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border-2 border-ink bg-surface active:translate-x-[2px] active:translate-y-[2px]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{navLinks}</div>
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
