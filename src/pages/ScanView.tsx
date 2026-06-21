import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Check, RotateCcw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, Card } from '@/components/ui/primitives';
import { QrThumb } from '@/components/ui/QrThumb';
import { RelocateModal } from '@/components/ui/RelocateModal';

const READER_ID = 'qr-reader';

// qrbox sized off the live viewfinder — a fixed box larger than the camera
// element throws inside html5-qrcode on narrow phone screens.
const responsiveQrbox = (w: number, h: number) => {
  const size = Math.max(140, Math.floor(Math.min(w, h) * 0.72));
  return { width: size, height: size };
};

export function ScanView() {
  const { assetUnits, assetTypes, spaces, moveUnit } = useStore();
  const [code, setCode] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const unit = code ? assetUnits.find((u) => u.qrCode === code) ?? null : null;
  const spaceName = (id: string) => spaces.find((s) => s.id === id)?.name ?? id;

  useEffect(() => {
    if (!scanning) return;
    let active = true;
    let scanner: Html5Qrcode | null = null;
    try {
      scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: responsiveQrbox },
          (decoded) => {
            if (!active) return;
            active = false;
            setCode(decoded);
            setScanning(false);
            scanner?.stop().catch(() => {});
          },
          () => {},
        )
        .catch(() => setScanning(false));
    } catch {
      setScanning(false);
    }
    return () => {
      active = false;
      scanner?.stop().catch(() => {});
    };
  }, [scanning]);

  function move(unitId: string, toSpaceId: string, status: 'deployed' | 'available') {
    const u = assetUnits.find((x) => x.id === unitId);
    moveUnit(unitId, toSpaceId, status);
    setToast(`${u?.qrCode ?? 'Tag'} → ${spaceName(toSpaceId)}`);
    setCode(null);
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-medium">Scan asset</h1>
        <p className="text-sm text-muted">Scan a cart tag to relocate it. The map updates live.</p>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-lg border-2 border-ink bg-hall-green px-3 py-2 text-sm font-semibold text-ok shadow-[3px_3px_0_0_var(--color-ink)]">
          <Check size={15} /> {toast}
        </div>
      )}

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
              className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-2 py-1.5 text-left transition hover:bg-surface-2"
            >
              <QrThumb value={u.qrCode} size={32} />
              <span className="font-mono text-xs text-muted">{u.qrCode}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* recognized → relocate popup */}
      {unit && (
        <RelocateModal
          unit={unit}
          assetTypes={assetTypes}
          spaces={spaces}
          onMove={move}
          onClose={() => setCode(null)}
        />
      )}

      {/* scanned something we don't know */}
      {code && !unit && (
        <Card className="p-4">
          <p className="text-sm font-medium text-danger">Unknown tag: {code}</p>
          <Button className="mt-3" onClick={() => setCode(null)}>
            <RotateCcw size={15} /> Scan another
          </Button>
        </Card>
      )}
    </div>
  );
}
