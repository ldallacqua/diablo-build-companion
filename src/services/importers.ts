import { BuildSchema, type AppState, type Build } from '../domain/models';
export interface BuildImporter {
  id: string;
  import(input: string): Build;
}
export const jsonImporter: BuildImporter = {
  id: 'json',
  import(input) {
    let value: unknown;
    try {
      value = JSON.parse(input);
    } catch {
      throw new Error('Invalid JSON. Check commas and quotation marks.');
    }
    const result = BuildSchema.safeParse(value);
    if (!result.success)
      throw new Error(
        result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .slice(0, 5)
          .join('\n'),
      );
    return result.data;
  },
};
export function maxrollReference(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Enter a valid Maxroll guide or planner URL.');
  }
  if (
    url.protocol !== 'https:' ||
    !['maxroll.gg', 'www.maxroll.gg'].includes(url.hostname) ||
    !url.pathname.startsWith('/d4/')
  )
    throw new Error('Use an https://maxroll.gg/d4/ guide or planner URL.');
  url.hash = '';
  return url.toString();
}
export function attachBuild(state: AppState, build: Build): AppState {
  const other = state.builds[build.stage === 'leveling' ? 'endgame' : 'leveling'];
  if (other && other.class.toLowerCase() !== build.class.toLowerCase())
    throw new Error('Both builds must use the same character class.');
  if (other?.id === build.id) throw new Error('Leveling and endgame builds need distinct IDs.');
  return {
    ...state,
    builds: { ...state.builds, [build.stage]: build },
    equipped: {},
    lastItem: null,
  };
}
export const emptyBuild = (stage: 'leveling' | 'endgame'): Build =>
  BuildSchema.parse({
    schemaVersion: 1,
    id: `${stage}-${Date.now()}`,
    name: stage === 'leveling' ? 'My leveling build' : 'My endgame build',
    class: 'Sorcerer',
    stage,
    updatedAt: new Date().toISOString(),
  });
