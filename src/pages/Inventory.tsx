import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Check, MapPin, PackageCheck, RotateCcw, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { detectConflicts } from '@/domain/conflicts';
import { conflictSpaceIds } from '@/domain/status';
import { Badge, Button, Card, SectionLabel, Stat } from '@/components/ui/primitives';
import { QrThumb } from '@/components/ui/QrThumb';

const Pyramid3D = lazy(() => import('@/components/map/Pyramid3D'));
const STORE_ID = 'store';
const READER_ID = 'inv-qr-reader';

export function Inventory() {
  const {
    spaces,
    events,
    reservations,
    assetTypes,
    assetUnits,
    scrubHour,
    selectedSpaceId,
    selectSpace,
    moveUnit,
  } = useStore();

  const conflicts = useMemo(
    () => detectConflicts(reservations, spaces, assetTypes),
    [reservations, spaces, assetTypes],
  );
  const cSpaceIds = useMemo(() => conflictSpaceIds(conflicts, events), [conflicts, events]);

  const [scanning, setScanning] = useState(false);
  const [focusCode, setFocusCode] = useState<string | null>(null);
  const [filterRoom, setFilterRoom] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const spaceName = (id: string) => spaces.find((s) => s.id === id)?.name ?? id;
  const typeLabel = (id: string) => assetTypes.find((t) => t.id === id)?.label ?? id;
  const destinations = spaces.filter((s) => s.bookable || s.type === 'storage');
  const focusUnit = focusCode ? assetUnits.find((u) => u.qrCode === focusCode) ?? null : null;

  const total = assetUnits.length;
  const deployed = assetUnits.filter((u) => u.status === 'deployed').length;
  const inStore = assetUnits.filter((u) => u.locationSpaceId === STORE_ID).length;

  const shownUnits = filterRoom ? assetUnits.filter((u) => u.locationSpaceId === filterRoom) : assetUnits;

  // camera scanner (same engine as the dedicated Scan view)
  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;
    let active = true;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 200 },
        (decoded) => {
          if (!active) return;
          active = false;
          setFocusCode(decoded);
          setScanning(false);
          scanner.stop().catch(() => {});
        },
        () => {},
      )
      .catch(() => setScanning(false));
    return () => {
      active = false;
      scanner.stop().catch(() => {});
    };
  }, [scanning]);

  function move(unitId: string, toSpaceId: string) {
    const status = toSpaceId === STORE_ID ? 'available' : 'deployed';
    moveUnit(unitId, toSpaceId, status);
    const u = assetUnits.find((x) => x.id === unitId);
    setToast(`${u?.qrCode ?? 'Tag'} → ${spaceName(toSpaceId)}`);
    setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium">Inventory</h1>
        <p className="text-sm text-muted">Every tagged cart, where it is, and one place to scan and relocate.</p>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-lg border-2 border-ink bg-hall-green px-3 py-2 text-sm font-semibold text-ok shadow-[3px_3px_0_0_var(--color-ink)]">
          <Check size={15} /> {toast}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tagged carts" value={total} />
        <Stat label="Deployed" value={deployed} />
        <Stat label="In store" value={inStore} />
        <Stat label="Asset types" value={assetTypes.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Map */}
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Where everything is</span>
            {filterRoom ? (
              <button
                onClick={() => {
                  setFilterRoom(null);
                  selectSpace(null);
                }}
                className="flex cursor-pointer items-center gap-1 text-xs text-info hover:underline"
              >
                <X size={12} /> clear filter
              </button>
            ) : (
              <span className="text-xs text-faint">tap a room to filter</span>
            )}
          </div>
          <Suspense
            fallback={
              <div className="flex h-[340px] w-full items-center justify-center rounded-lg border-2 border-ink text-sm text-muted" style={{ background: '#fbf7ef' }}>
                Loading 3D twin…
              </div>
            }
          >
            <Pyramid3D
              spaces={spaces}
              events={events}
              scrubHour={scrubHour}
              conflictSpaceIds={cSpaceIds}
              selectedSpaceId={selectedSpaceId}
              onSelect={(id) => {
                selectSpace(id);
                setFilterRoom(id);
              }}
            />
          </Suspense>
        </Card>

        {/* Scan */}
        <Card className="p-4">
          <SectionLabel>Scan a tag</SectionLabel>
          {focusUnit ? (
            <div>
              <div className="flex items-center gap-3">
                <QrThumb value={focusUnit.qrCode} size={52} />
                <div>
                  <div className="font-mono text-xs text-muted">{focusUnit.qrCode}</div>
                  <div className="text-base font-medium">
                    {focusUnit.quantity}× {typeLabel(focusUnit.assetTypeId)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-faint">
                    <MapPin size={12} /> {spaceName(focusUnit.locationSpaceId)}
                  </div>
                </div>
                <Badge tone={focusUnit.status === 'deployed' ? 'info' : 'ok'} className="ml-auto">
                  {focusUnit.status}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  defaultValue=""
                  onChange={(e) => e.target.value && move(focusUnit.id, e.target.value)}
                  className="flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-line-strong"
                >
                  <option value="" disabled>
                    Deploy to…
                  </option>
                  {destinations
                    .filter((s) => s.id !== STORE_ID)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
                <Button onClick={() => move(focusUnit.id, STORE_ID)}>
                  <RotateCcw size={14} /> Return
                </Button>
                <Button onClick={() => setFocusCode(null)}>Done</Button>
              </div>
            </div>
          ) : (
            <>
              <div id={READER_ID} className="mx-auto mb-3 w-full overflow-hidden rounded-lg" />
              <Button variant="primary" className="w-full justify-center" onClick={() => setScanning((s) => !s)}>
                <Camera size={15} /> {scanning ? 'Stop camera' : 'Start camera'}
              </Button>
              <div className="my-3 text-center text-xs text-faint">or tap a tag to simulate a scan</div>
              <div className="grid grid-cols-2 gap-2">
                {assetUnits.slice(0, 6).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setFocusCode(u.qrCode)}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-2 py-1.5 text-left transition-colors hover:bg-white/5"
                  >
                    <QrThumb value={u.qrCode} size={30} />
                    <span className="font-mono text-xs text-muted">{u.qrCode}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Every code */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <SectionLabel>
            {filterRoom ? `Tags in ${spaceName(filterRoom)} (${shownUnits.length})` : `Every tag (${shownUnits.length})`}
          </SectionLabel>
        </div>
        <div className="space-y-2">
          {shownUnits.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-2.5"
            >
              <QrThumb value={u.qrCode} size={40} />
              <div className="min-w-[140px]">
                <div className="font-mono text-xs text-muted">{u.qrCode}</div>
                <div className="text-sm">
                  {u.quantity}× {typeLabel(u.assetTypeId)}
                </div>
              </div>
              <button
                onClick={() => {
                  selectSpace(u.locationSpaceId);
                  setFilterRoom(u.locationSpaceId);
                }}
                className="flex cursor-pointer items-center gap-1 text-xs text-muted hover:text-info"
                title="Show this room on the map"
              >
                <MapPin size={12} /> {spaceName(u.locationSpaceId)}
              </button>
              <Badge tone={u.status === 'deployed' ? 'info' : u.status === 'available' ? 'ok' : 'neutral'}>
                {u.status}
              </Badge>
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={u.locationSpaceId}
                  onChange={(e) => move(u.id, e.target.value)}
                  className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-line-strong"
                >
                  {destinations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {u.locationSpaceId !== STORE_ID && (
                  <Button onClick={() => move(u.id, STORE_ID)} className="px-2">
                    <PackageCheck size={13} /> Return
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
