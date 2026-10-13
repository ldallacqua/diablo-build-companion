import { BuildSchema, type AppState } from '../domain/models';
export const levelingExample = BuildSchema.parse({
  schemaVersion: 1,
  id: 'example-leveling',
  name: 'Arc Initiate',
  class: 'Sorcerer',
  stage: 'leveling',
  attribution: 'Original illustrative fixture — not a current-season guide',
  season: 'Illustrative',
  patch: 'Unverified',
  updatedAt: '2026-10-13T00:00:00.000Z',
  affixes: [
    { id: 'intelligence', label: 'Intelligence', aliases: [], priority: 'primary' },
    { id: 'maximum-life', label: 'Maximum Life', aliases: ['Max Life'], priority: 'secondary' },
  ],
  skills: [
    { id: 'spark-1', name: 'Spark', rank: 1 },
    { id: 'spark-2', name: 'Spark', rank: 2 },
    { id: 'chain-1', name: 'Chain Lightning', rank: 1 },
    { id: 'chain-2', name: 'Chain Lightning', rank: 2 },
    { id: 'chain-3', name: 'Chain Lightning', rank: 3 },
  ],
  paragon: [],
});
export const endgameExample = BuildSchema.parse({
  schemaVersion: 1,
  id: 'example-endgame',
  name: 'Stormbound',
  class: 'Sorcerer',
  stage: 'endgame',
  attribution: 'Original illustrative fixture — not a current-season guide',
  season: 'Illustrative',
  patch: 'Unverified',
  updatedAt: '2026-10-13T00:00:00.000Z',
  affixes: [
    {
      id: 'critical-strike-chance',
      label: 'Critical Strike Chance',
      aliases: ['Crit Chance'],
      priority: 'primary',
      slots: ['ring', 'gloves', 'amulet'],
      minimum: 8,
      unit: 'percent',
    },
    {
      id: 'attack-speed',
      label: 'Attack Speed',
      aliases: [],
      priority: 'primary',
      minimum: 10,
      unit: 'percent',
    },
    { id: 'intelligence', label: 'Intelligence', aliases: [], priority: 'secondary' },
  ],
  aspects: ['Stormweaver'],
  uniques: ['Ring of the Tempest'],
  skills: [
    { id: 'chain-1', name: 'Chain Lightning', rank: 1 },
    { id: 'chain-2', name: 'Chain Lightning', rank: 2 },
    { id: 'chain-3', name: 'Chain Lightning', rank: 3 },
  ],
  paragon: [
    {
      id: 'board-1',
      board: 'Starting Board',
      glyph: 'Player-selected glyph',
      objective: 'Follow your supplied guide to the first glyph socket',
    },
    {
      id: 'board-2',
      board: 'Next Board',
      objective: 'Confirm the next board and its rotation in your guide',
    },
  ],
  prerequisites: [
    { id: 'level', label: 'Reach your configured level target (70)', kind: 'level', value: 70 },
    { id: 'power', label: 'Obtain Stormweaver', kind: 'aspect', target: 'Stormweaver' },
    { id: 'review', label: 'Review the full skill and Paragon plan', kind: 'manual' },
  ],
  tempering: ['Attack speed priority (illustrative)'],
  masterworking: ['Follow your guide; no automatic roll simulation'],
});
export const exampleTooltip =
  'RING OF THE TEMPEST\nUnique Ring\n800 Item Power\n+10.5% Critical Strike Chance\n+12% Attack Speed\nAspect: Stormweaver\nRequired Level 70';
export function withExamples(state: AppState): AppState {
  return {
    ...state,
    onboarded: true,
    builds: { leveling: levelingExample, endgame: endgameExample },
    character: { name: 'Wanderer', level: 42, paragon: 0 },
  };
}
