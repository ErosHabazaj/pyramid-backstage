import { NavLink, Outlet } from 'react-router-dom';
import { Boxes, CalendarDays, LayoutDashboard, QrCode, Sparkles, TrendingUp, Triangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const REALTIME = {
  on: { color: '#1d9e75', label: 'Realtime on' },
  connecting: { color: '#ba7517', label: 'Connecting…' },
  off: { color: '#9a9a93', label: 'Local mode' },
} as const;

const NAV = [
  { to: '/', label: 'Command center', icon: LayoutDashboard, end: true },
  { to: '/intake', label: 'Intake', icon: Sparkles, end: false },
  { to: '/inventory', label: 'Inventory', icon: Boxes, end: false },
  { to: '/forecast', label: 'Forecast', icon: TrendingUp, end: false },
  { to: '/events', label: 'Events', icon: CalendarDays, end: false },
];

export function AppShell() {
  const realtimeStatus = useStore((s) => s.realtimeStatus);
  const rt = REALTIME[realtimeStatus];
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-white">
            <Triangle size={16} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium">Pyramid</div>
            <div className="text-xs text-muted">Backstage</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm',
                  isActive ? 'bg-surface-2 font-medium text-ink' : 'text-muted hover:bg-surface-2',
                )
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 p-3">
          <NavLink
            to="/scan"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-line-strong px-3 py-2 text-sm transition hover:bg-surface-2 active:scale-[0.98]"
          >
            <QrCode size={15} /> Scan asset
          </NavLink>
          <div className="flex items-center gap-1.5 px-1 text-xs text-muted">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: rt.color }} />
            {rt.label}
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
