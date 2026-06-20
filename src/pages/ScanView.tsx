import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Check, MapPin, PackageCheck, RotateCcw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Badge, Button, Card, SectionLabel } from '@/components/ui/primitives';
import { QrThumb } from '@/components/ui/QrThumb';

const STORE_ID = 's0-box-9';
const READER_ID = 'qr-reader';

export function ScanView() {
  const { assetUnits, assetTypes, spaces, moveUnit } = useStore();
  const [code, setCode] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [dest, setDest] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const unit = code ? assetUnits.find((u) => u.qrCode === code) ?? null : null;
  const typeLabel = (id: string) => assetTypes.find((t) => t.id === id)?.label ?? id;
  const spaceName = (id: string) => spaces.find((s) => s.id === id)?.name ?? id;
  const destinations = spaces.filter((s) => s.bookable || s.type === 'storage');

  useEffect(() => {
    if (unit) setDest(unit.locationSpaceId);
  }, [unit]);

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;
    let active = true;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decoded) => {
          if (!active) return;
          active = false;
          setCode(decoded);
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

  function apply(status: 'deployed' | 'available') {
    if (!unit) return;
    const to = status === 'available' ? STORE_ID : dest || unit.locationSpaceId;
    moveUnit(unit.id, to, status);
    setToast(
      status === 'available'
        ? `${unit.qrCode} returned to ${spaceName(STORE_ID)}`
        : `${unit.qrCode} deployed to ${spaceName(to)}`,
    );
    setCode(null);
    setDest('');
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-medium">Scan asset</h1>
        <p className="text-sm text-muted">Scan a cart tag to relocate it. The map updates live.</p>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-lg bg-[#e1f5ee] px-3 py-2 text-sm text-ok">
          <Check size={15} /> {toast}
        </div>
      )}

      {!unit && (
        <Card className="p-4">
          <div id={READER_ID} className="mx-auto mb-3 w-full overflow-hidden rounded-lg" />
          <Button variant="primary" className="w-full justify-center" onClick={() => setScanning((s) => !s)}>
            <Camera size={15} /> {scanning ? 'Stop camera' : 'Start camera'}
          </Button>

          <div className="my-3 text-center text-xs text-faint">or tap a tag to simulate a scan</div>
          <div className="grid grid-cols-2 gap-2">
            {assetUnits.slice(0, 6).map((u) => (
              <button
                key={u.id}
                onClick={() => setCode(u.qrCode)}
                className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-left transition hover:bg-surface-2"
              >
                <QrThumb value={u.qrCode} size={32} />
                <span className="font-mono text-xs text-muted">{u.qrCode}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {code && !unit && (
        <Card className="p-4">
          <p className="text-sm text-danger">Unknown tag: {code}</p>
          <Button className="mt-3" onClick={() => setCode(null)}>
            <RotateCcw size={15} /> Scan another
          </Button>
        </Card>
      )}

      {unit && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <QrThumb value={unit.qrCode} size={56} />
            <div>
              <div className="font-mono text-xs text-muted">{unit.qrCode}</div>
              <div className="text-base font-medium">
                {unit.quantity}× {typeLabel(unit.assetTypeId)}
              </div>
              <div className="flex items-center gap-1 text-xs text-faint">
                <MapPin size={12} /> {spaceName(unit.locationSpaceId)}
              </div>
            </div>
            <Badge tone={unit.status === 'deployed' ? 'info' : 'ok'} className="ml-auto">
              {unit.status}
            </Badge>
          </div>

          <div className="mt-4">
            <SectionLabel>Deploy to</SectionLabel>
            <select
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-line-strong"
            >
              {destinations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex gap-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={() => apply('deployed')}>
              <PackageCheck size={15} /> Deploy here
            </Button>
            <Button className="justify-center" onClick={() => apply('available')}>
              <RotateCcw size={15} /> Return
            </Button>
          </div>
          <button
            onClick={() => setCode(null)}
            className="mt-3 w-full text-center text-xs text-muted underline-offset-2 hover:underline"
          >
            scan another
          </button>
        </Card>
      )}
    </div>
  );
}
