import { StateSchema, freshState, type AppState } from '../domain/models';
export function decodeState(input: unknown): AppState {
  if (
    typeof input === 'object' &&
    input !== null &&
    'schemaVersion' in input &&
    (input as { schemaVersion: unknown }).schemaVersion === 1
  )
    return StateSchema.parse({ ...input, schemaVersion: 2, assets: [], equipped: {} });
  return StateSchema.parse(input);
}
export function loadBrowserState(): AppState {
  try {
    const text = localStorage.getItem('sanctum.v2');
    return text ? decodeState(JSON.parse(text)) : freshState();
  } catch {
    return freshState();
  }
}
export function saveBrowserState(state: AppState): void {
  localStorage.setItem('sanctum.v2', JSON.stringify(StateSchema.parse(state)));
}
