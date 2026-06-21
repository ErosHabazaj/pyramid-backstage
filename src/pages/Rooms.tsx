import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { capacities, SETUP_LABEL } from '@/domain/capacity';
import { useStore } from '@/store/useStore';
import { Badge, Button, Card, SectionLabel } from '@/components/ui/primitives';

const FEATURE_LABEL: Record<string, string> = {
  stage: 'Stage',
  'av-rig': 'AV rig',
  'step-free': 'Step-free',
  'natural-light': 'Natural light',
  power: 'Power',
};

export function Rooms() {
  const spaces = useStore((s) => s.spaces);
  const rooms = spaces.filter((s) => s.bookable);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Browse rooms</h1>
          <p className="text-sm text-muted">Every bookable space in the Pyramid, with capacities by setup.</p>
        </div>
        <Link to="/propose">
          <Button variant="primary">
            Propose an event <ArrowRight size={15} />
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((s) => {
          const cap = capacities(s);
          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-medium">{s.name}</div>
                  <div className="text-xs text-muted">
                    {s.floor === 0 ? 'Floor 0' : 'Floor −1'} · {s.areaM2} m²
                  </div>
                </div>
                <Badge tone="info">Holds {cap.theater}</Badge>
              </div>

              {s.note && <p className="mt-2 text-sm text-muted">{s.note}</p>}

              <div className="mt-3">
                <SectionLabel>Capacity by setup</SectionLabel>
                <div className="grid grid-cols-2 gap-1.5 text-sm">
                  {(['theater', 'banquet', 'classroom', 'standing'] as const).map((style) => (
                    <div key={style} className="flex items-center justify-between rounded-md bg-surface-2 px-2.5 py-1">
                      <span className="text-muted">{SETUP_LABEL[style]}</span>
                      <span className="font-medium tabular-nums">{cap[style]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {s.features.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.features.map((f) => (
                    <Badge key={f} tone="neutral">
                      {FEATURE_LABEL[f] ?? f}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
