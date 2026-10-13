import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { GameLibrarySchema, type GameInspection, type GameLibrary } from '../src/shared/gameAssets';

export function createGameAssets(
  directory: string,
  worker: string,
  report: (message: string) => void,
) {
  let installation: string | undefined, child: ChildProcess | undefined;
  let running = false;
  async function load(): Promise<GameLibrary | null> {
    try {
      const filename = path.join(directory, 'game-library.json');
      if ((await fs.stat(filename)).size > 12 * 1024 * 1024)
        throw new Error('Game library index is too large.');
      return GameLibrarySchema.parse(JSON.parse(await fs.readFile(filename, 'utf8')));
    } catch {
      return null;
    }
  }
  async function run(operation: '--inspect' | '--extract', names?: string[]) {
    if (!installation) throw new Error('Choose your installed Diablo IV folder first.');
    if (running) throw new Error('Game asset indexing or extraction is already running.');
    running = true;
    try {
      const selection = path.join(directory, 'game-asset-selection.json');
      if (names) await fs.writeFile(selection, JSON.stringify(names));
      const args = [
        worker,
        operation,
        '--installation',
        installation,
        '--output',
        directory,
        ...(names ? ['--selection', selection] : []),
      ];
      report(
        operation === '--inspect'
          ? 'Opening your local archive'
          : 'Extracting selected UI resources',
      );
      return await new Promise<unknown>((resolve, reject) => {
        const process = spawn(globalThis.process.execPath, args, {
          env: { ...globalThis.process.env, ELECTRON_RUN_AS_NODE: '1' },
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        child = process;
        const chunks: Buffer[] = [];
        let size = 0,
          pending = '',
          lastError = '';
        const timeout = setTimeout(() => process.kill(), 180000);
        process.stdout.on('data', (data: Buffer) => {
          size += data.length;
          if (size > 12 * 1024 * 1024) process.kill();
          else chunks.push(data);
        });
        process.stderr.on('data', (data: Buffer) => {
          pending += data.toString('utf8');
          if (pending.length > 100000) {
            process.kill();
            return;
          }
          const lines = pending.split('\n');
          pending = lines.pop()!;
          for (const line of lines)
            try {
              const record = JSON.parse(line);
              if (typeof record.message === 'string') report(record.message);
              if (typeof record.error === 'string') lastError = record.error;
            } catch {
              /* Native diagnostics are not product copy. */
            }
        });
        process.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        process.on('close', (code) => {
          clearTimeout(timeout);
          if (code !== 0) {
            reject(new Error(lastError || 'Game asset operation stopped before completion.'));
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch {
            reject(new Error('Could not read the extraction result.'));
          }
        });
      });
    } finally {
      child = undefined;
      running = false;
      report('');
    }
  }
  return {
    load,
    async inspect(selected: string) {
      if (running) throw new Error('Game asset indexing or extraction is already running.');
      const resolved = await fs.realpath(selected);
      await fs.access(path.join(resolved, 'Data', '.build.config')).catch(() => {
        throw new Error(
          'Select a Steam Diablo IV installation containing Data/.build.config. Battle.net archives are not supported by this extractor yet.',
        );
      });
      if (running) throw new Error('Game asset indexing or extraction is already running.');
      installation = resolved;
      return (await run('--inspect')) as GameInspection;
    },
    async extract(names?: string[]) {
      await run('--extract', names);
      const library = await load();
      if (!library) throw new Error('The private game library could not be verified.');
      return library;
    },
    async read(key: string) {
      const library = await load(),
        resource = library?.resources.find((r) => r.key === key);
      if (!resource || resource.filename !== resource.checksum + '.png') return null;
      try {
        const filename = path.join(directory, 'assets', resource.filename);
        if ((await fs.stat(filename)).size > 12 * 1024 * 1024) return null;
        const buffer = await fs.readFile(filename);
        if (createHash('sha256').update(buffer).digest('hex') !== resource.checksum) return null;
        return 'data:image/png;base64,' + buffer.toString('base64');
      } catch {
        return null;
      }
    },
    cancel() {
      child?.kill();
    },
    get busy() {
      return running;
    },
  };
}
