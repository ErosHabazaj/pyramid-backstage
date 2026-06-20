import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { CommandCenter } from '@/pages/CommandCenter';
import { Intake } from '@/pages/Intake';
import { Inventory } from '@/pages/Inventory';
import { EventsList } from '@/pages/EventsList';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';

// Heavy deps (html5-qrcode, recharts) — load these routes on demand.
const ScanView = lazy(() => import('@/pages/ScanView').then((m) => ({ default: m.ScanView })));
const Forecast = lazy(() => import('@/pages/Forecast').then((m) => ({ default: m.Forecast })));

export default function App() {
  useSupabaseSync();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<CommandCenter />} />
          <Route path="intake" element={<Intake />} />
          <Route path="inventory" element={<Inventory />} />
          <Route
            path="forecast"
            element={
              <Suspense fallback={<div className="p-6 text-sm text-muted">Loading forecast…</div>}>
                <Forecast />
              </Suspense>
            }
          />
          <Route path="events" element={<EventsList />} />
          <Route
            path="scan"
            element={
              <Suspense fallback={<div className="p-6 text-sm text-muted">Loading scanner…</div>}>
                <ScanView />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
