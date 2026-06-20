import type {
  AssetRequirement,
  OpsTask,
  SetupStyle,
  Space,
} from './types';

// ── Operational planning ─────────────────────────────────────────────
// Turn a setup style + headcount into the assets and the setup/teardown
// task list — the "what's next?" half of the brief. Deterministic.

export function deriveAssetReqs(
  headcount: number,
  setupStyle: SetupStyle,
): AssetRequirement[] {
  const reqs: AssetRequirement[] = [];
  const add = (assetTypeId: string, quantity: number) => {
    if (quantity > 0) reqs.push({ assetTypeId, quantity: Math.ceil(quantity) });
  };

  switch (setupStyle) {
    case 'theater':
      add('chair', headcount);
      add('riser', 6);
      break;
    case 'classroom':
      add('chair', headcount);
      add('table-rect', headcount / 2);
      break;
    case 'banquet':
      add('chair', headcount);
      add('table-round', headcount / 8);
      add('riser', 4);
      break;
    case 'cabaret':
      add('chair', headcount * 0.7);
      add('table-round', headcount / 6);
      break;
    case 'standing':
      add('chair', headcount * 0.2);
      add('table-round', headcount / 15);
      break;
  }

  add('mic-handheld', headcount > 150 ? 3 : 2);
  add('mic-lav', 2);
  add('projector', 1);
  add('screen', 1);
  add('speaker', Math.max(2, Math.ceil(headcount / 60)));
  add('lectern', 1);
  return reqs;
}

export function deriveTasks(
  eventId: string,
  space: Space,
  setupStyle: SetupStyle,
  headcount: number,
  entranceName = 'the entrance',
): OpsTask[] {
  const id = (n: number) => `${eventId}-tk${n}`;
  return [
    { id: id(1), eventId, phase: 'setup', team: 'logistics', title: `Set ${setupStyle} layout for ${headcount} in ${space.name}`, dueOffsetMin: -120, done: false },
    { id: id(2), eventId, phase: 'setup', team: 'av', title: 'Rig AV — PA, projector + screen', dueOffsetMin: -150, done: false },
    { id: id(3), eventId, phase: 'setup', team: 'av', title: 'Sound-check microphones', dueOffsetMin: -60, done: false, dependsOn: [id(2)] },
    { id: id(4), eventId, phase: 'setup', team: 'front-desk', title: `Registration desk at ${entranceName}`, dueOffsetMin: -90, done: false },
    { id: id(5), eventId, phase: 'teardown', team: 'logistics', title: 'Strike and return all equipment to store', dueOffsetMin: 60, done: false },
    { id: id(6), eventId, phase: 'teardown', team: 'cleaning', title: `Clean and reset ${space.name}`, dueOffsetMin: 90, done: false, dependsOn: [id(5)] },
  ];
}
