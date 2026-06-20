import { useStore } from '@/store/useStore';
import { Badge, Card, SectionLabel } from '@/components/ui/primitives';
import { QrThumb } from '@/components/ui/QrThumb';

export function Inventory() {
  const { assetTypes, assetUnits, spaces } = useStore();

  const spaceName = (id: string) => spaces.find((s) => s.id === id)?.name ?? id;

  const rows = assetTypes.map((at) => {
    const available = at.totalStock - at.maintenanceReserve;
    const deployed = assetUnits
      .filter((u) => u.assetTypeId === at.id && u.status === 'deployed')
      .reduce((s, u) => s + u.quantity, 0);
    return { at, available, deployed };
  });

  const units = assetUnits.filter((u) => u.assetTypeId === 'chair' || u.status === 'deployed');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium">Inventory</h1>
        <p className="text-sm text-muted">
          Live stock across the venue, what’s deployed, and how much remains.
        </p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-2 font-medium">Asset</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
              <th className="px-4 py-2 text-right font-medium">Reserve</th>
              <th className="px-4 py-2 text-right font-medium">Deployed</th>
              <th className="px-4 py-2 text-right font-medium">Available</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ at, available, deployed }) => (
              <tr key={at.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2">{at.label}</td>
                <td className="px-4 py-2 text-right tabular-nums">{at.totalStock}</td>
                <td className="px-4 py-2 text-right tabular-nums text-muted">{at.maintenanceReserve}</td>
                <td className="px-4 py-2 text-right tabular-nums">{deployed}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{available - deployed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <SectionLabel>Tagged carts</SectionLabel>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {units.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-lg border border-line px-3 py-2"
            >
              <QrThumb value={u.qrCode} size={44} />
              <div className="flex-1">
                <div className="font-mono text-xs text-muted">{u.qrCode}</div>
                <div className="text-sm">
                  {u.quantity}× {assetTypes.find((t) => t.id === u.assetTypeId)?.label}
                </div>
                <div className="text-xs text-faint">at {spaceName(u.locationSpaceId)}</div>
              </div>
              <Badge tone={u.status === 'deployed' ? 'info' : u.status === 'available' ? 'ok' : 'neutral'}>
                {u.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
