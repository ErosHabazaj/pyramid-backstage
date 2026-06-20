import type { AssetUnit, EventRequest, Space } from '@/domain/types';
import { circlePoly } from '@/domain/geometry';
import { spaceStatusAt, statusColor } from '@/domain/status';
import {
  FLOOR_ORDER,
  FLOOR_Y,
  PLATE_THICKNESS,
  project,
  projectPoly,
  VIEWBOX,
} from './iso';

interface FloorStackProps {
  spaces: Space[];
  events: EventRequest[];
  assetUnits: AssetUnit[];
  scrubHour: number;
  conflictSpaceIds: Set<string>;
  selectedSpaceId: string | null;
  onSelect: (id: string) => void;
}

const PLATE = circlePoly(46);

export function FloorStack({
  spaces,
  events,
  assetUnits,
  scrubHour,
  conflictSpaceIds,
  selectedSpaceId,
  onSelect,
}: FloorStackProps) {
  return (
    <svg
      viewBox={VIEWBOX}
      width="100%"
      role="img"
      aria-label="Live isometric map of the Pyramid, floor 0"
    >
      <line
        x1={155}
        y1={28}
        x2={155}
        y2={286}
        stroke="var(--color-line-strong)"
        strokeWidth={1}
        strokeDasharray="3 4"
      />

      {FLOOR_ORDER.map((floor) => {
        const platePts = projectPoly(PLATE, floor);
        const floorSpaces = spaces.filter((s) => s.floor === floor);
        const center = project({ x: 50, y: 50 }, floor);
        return (
          <g key={floor}>
            <polygon points={platePts} transform={`translate(0 ${PLATE_THICKNESS})`} fill="#e7e7e2" />
            <polygon points={platePts} fill="var(--color-surface)" stroke="var(--color-line)" strokeWidth={1} />

            {floorSpaces.length === 0 && (
              <text x={center.x} y={center.y} textAnchor="middle" fontSize={8} fill="#9a9a93">
                to be mapped
              </text>
            )}

            {floorSpaces.map((space) => {
              const status = spaceStatusAt(space, events, scrubHour, conflictSpaceIds);
              const pts = projectPoly(space.footprint, floor);
              const fill = space.color?.fill ?? (space.type === 'storage' ? '#eceae3' : '#f2f1ec');
              const stroke = space.color?.ink ?? '#b7b7af';
              const anchorPt = space.anchor ?? space.footprint[0];
              const a = project(anchorPt, floor);
              const selected = space.id === selectedSpaceId;
              const deployed = assetUnits.filter(
                (u) => u.locationSpaceId === space.id && u.status === 'deployed',
              );
              return (
                <g key={space.id} onClick={() => onSelect(space.id)} style={{ cursor: 'pointer' }}>
                  <polygon
                    points={pts}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1}
                    opacity={space.bookable ? 1 : 0.85}
                  />
                  {status === 'conflict' && (
                    <polygon points={pts} fill="none" stroke="#e24b4a" strokeWidth={2.2} strokeDasharray="4 3" />
                  )}
                  {selected && <polygon points={pts} fill="none" stroke="#378add" strokeWidth={2.2} />}

                  <text
                    x={a.x}
                    y={a.y}
                    textAnchor="middle"
                    fontSize={7}
                    fontWeight={500}
                    fill={space.color?.ink ?? '#5f5e5a'}
                  >
                    {space.name}
                  </text>
                  <circle cx={a.x} cy={a.y + 6} r={2.2} fill={statusColor(status)} />
                  {deployed.slice(0, 6).map((u, i) => (
                    <circle key={u.id} cx={a.x - 10 + i * 4} cy={a.y + 13} r={1.7} fill="#1d9e75" />
                  ))}
                </g>
              );
            })}

            <text x={10} y={FLOOR_Y[floor] + 8} fontSize={8} fill="#6b6b66">
              {floor === 0 ? 'Floor 0' : 'Floor −1'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
