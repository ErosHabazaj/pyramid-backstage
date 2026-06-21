import { useState } from 'react';
import { MapPin, PackageCheck, RotateCcw } from 'lucide-react';
import type { AssetType, AssetUnit, Space } from '@/domain/types';
import { Modal } from './Modal';
import { Badge, Button } from './primitives';
import { QrThumb } from './QrThumb';

const STORE_ID = 'store';

// Popup shown after a tag is scanned/recognized: relocate it to another room
// (deploy) or send it back to the store (return).
export function RelocateModal({
  unit,
  assetTypes,
  spaces,
  onMove,
  onClose,
}: {
  unit: AssetUnit;
  assetTypes: AssetType[];
  spaces: Space[];
  onMove: (unitId: string, toSpaceId: string, status: 'deployed' | 'available') => void;
  onClose: () => void;
}) {
  const typeLabel = (id: string) => assetTypes.find((t) => t.id === id)?.label ?? id;
  const spaceName = (id: string) => spaces.find((s) => s.id === id)?.name ?? id;
  const destinations = spaces.filter((s) => s.bookable || s.type === 'storage');
  const [dest, setDest] = useState(unit.locationSpaceId);

  return (
    <Modal open onClose={onClose} title="Relocate tag">
      <div className="flex items-center gap-3">
        <QrThumb value={unit.qrCode} size={52} />
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted">{unit.qrCode}</div>
          <div className="text-base font-semibold">
            {unit.quantity}× {typeLabel(unit.assetTypeId)}
          </div>
          <div className="flex items-center gap-1 text-xs text-faint">
            <MapPin size={12} /> {spaceName(unit.locationSpaceId)}
          </div>
        </div>
        <Badge tone={unit.status === 'deployed' ? 'info' : 'ok'} className="ml-auto shrink-0">
          {unit.status}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-xs font-bold tracking-widest text-ink uppercase">Move to room</div>
        <select
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          className="w-full rounded-md border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple/50"
        >
          {destinations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant="primary"
          className="flex-1 justify-center"
          onClick={() => onMove(unit.id, dest, dest === STORE_ID ? 'available' : 'deployed')}
        >
          <PackageCheck size={15} /> Move here
        </Button>
        <Button className="justify-center" onClick={() => onMove(unit.id, STORE_ID, 'available')}>
          <RotateCcw size={15} /> Return
        </Button>
      </div>
    </Modal>
  );
}
