import fs from 'node:fs/promises';
import path from 'node:path';
import { decodeState } from '../src/services/storage';
import { freshState, StateSchema, type AppState } from '../src/domain/models';
export async function readState(directory: string): Promise<{ state: AppState; warning?: string }> {
  try {
    return {
      state: decodeState(JSON.parse(await fs.readFile(path.join(directory, 'state.json'), 'utf8'))),
    };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { state: freshState() };
    return {
      state: freshState(),
      warning:
        'Saved data could not be read. The original file is preserved until you save a new change.',
    };
  }
}
export async function persistState(directory: string, state: AppState) {
  const data = StateSchema.parse(state);
  await fs.mkdir(directory, { recursive: true });
  const filename = path.join(directory, 'state.json');
  await fs.writeFile(`${filename}.tmp`, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(`${filename}.tmp`, filename);
}
