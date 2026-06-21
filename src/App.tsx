import { lazy, Suspense, type ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { CommandCenter } from '@/pages/CommandCenter';
import { Proposals } from '@/pages/Proposals';
import { Manage } from '@/pages/Manage';
import { Propose } from '@/pages/Propose';
import { Rooms } from '@/pages/Rooms';
import { EventsList } from '@/pages/EventsList';
import { EventsCalendar } from '@/pages/EventsCalendar';
import { Login } from '@/pages/Login';
import type { Role } from '@/domain/types';
import { homeFor } from '@/lib/roles';
import { useStore } from '@/store/useStore';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { useAuthSession } from '@/hooks/useAuthSession';

// Heavy deps (html5-qrcode, recharts) — load these routes on demand.
const ScanView = lazy(() => import('@/pages/ScanView').then((m) => ({ default: m.ScanView })));
const Forecast = lazy(() => import('@/pages/Forecast').then((m) => ({ default: m.Forecast })));
const Inventory = lazy(() => import('@/pages/Inventory').then((m) => ({ default: m.Inventory })));

const loading = (label: string) => <div className="p-6 text-sm text-muted">Loading {label}…</div>;

/** Gate a route by role: wrong role → that role's home; signed out → login. */
function RequireRole({ allow, children }: { allow: Role[]; children: ReactElement }) {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!allow.includes(currentUser.role)) return <Navigate to={homeFor(currentUser.role)} replace />;
  return children;
}

export default function App() {
  useAuthSession();
  useSupabaseSync();
  const authReady = useStore((s) => s.authReady);

  if (!authReady) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted">Loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppShell />}>
          {/* Manager */}
          <Route index element={<RequireRole allow={['manager']}><CommandCenter /></RequireRole>} />
          <Route path="proposals" element={<RequireRole allow={['manager']}><Proposals /></RequireRole>} />
          <Route path="manage" element={<RequireRole allow={['manager']}><Manage /></RequireRole>} />
          <Route
            path="inventory"
            element={
              <RequireRole allow={['manager']}>
                <Suspense fallback={loading('inventory')}>
                  <Inventory />
                </Suspense>
              </RequireRole>
            }
          />
          <Route path="events" element={<RequireRole allow={['manager']}><EventsList /></RequireRole>} />
          <Route
            path="forecast"
            element={
              <RequireRole allow={['manager']}>
                <Suspense fallback={loading('forecast')}>
                  <Forecast />
                </Suspense>
              </RequireRole>
            }
          />
          <Route
            path="scan"
            element={
              <RequireRole allow={['manager']}>
                <Suspense fallback={loading('scanner')}>
                  <ScanView />
                </Suspense>
              </RequireRole>
            }
          />

          {/* Organizer */}
          <Route path="propose" element={<RequireRole allow={['organizer']}><Propose /></RequireRole>} />
          <Route path="rooms" element={<RequireRole allow={['organizer']}><Rooms /></RequireRole>} />

          {/* Attendee */}
          <Route path="calendar" element={<RequireRole allow={['attendee']}><EventsCalendar /></RequireRole>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
