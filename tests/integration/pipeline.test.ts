import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { jsonImporter, attachBuild, maxrollReference } from '../../src/services/importers';
import { freshState, StateSchema } from '../../src/domain/models';
import { decodeState } from '../../src/services/storage';
import { levelingExample, endgameExample, withExamples } from '../../src/data/examples';
import { catalogue, parseItem } from '../../src/domain/parser';
import { evaluate } from '../../src/domain/recommendations';
import { persistState, readState } from '../../desktop/persistence';
import { recognize, stopOcr } from '../../desktop/ocr';
afterEach(() => stopOcr());
describe('import and storage', () => {
  it('normalizes partial builds with defaults and rejects bad input', () => {
    const minimal = {
      schemaVersion: 1,
      id: 'a',
      name: 'Build',
      class: 'Sorcerer',
      stage: 'leveling',
      updatedAt: new Date().toISOString(),
    };
    expect(jsonImporter.import(JSON.stringify(minimal)).coverage).toBe('partial');
    expect(() => jsonImporter.import('{oops')).toThrow('Invalid JSON');
    expect(() => jsonImporter.import(JSON.stringify({ ...minimal, schemaVersion: 9 }))).toThrow();
  });
  it('imports two builds and enforces matching classes', () => {
    let s = attachBuild(freshState(), jsonImporter.import(JSON.stringify(levelingExample)));
    s = attachBuild(s, endgameExample);
    expect(s.builds.endgame?.name).toBe('Stormbound');
    expect(() => attachBuild(s, { ...endgameExample, class: 'Rogue' })).toThrow(
      'same character class',
    );
  });
  it('checks references without fetching or allowing arbitrary hosts', () => {
    expect(maxrollReference('https://maxroll.gg/d4/planner/test#anchor')).toBe(
      'https://maxroll.gg/d4/planner/test',
    );
    for (const url of [
      'http://maxroll.gg/d4/a',
      'https://maxroll.gg.evil.test/d4/a',
      'file:///secret',
    ])
      expect(() => maxrollReference(url)).toThrow();
  });
  it('writes and reloads builds, progress, active state and settings atomically', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sanctum-storage-'));
    try {
      const s = withExamples(freshState());
      s.active = 'endgame';
      s.transition = 'endgame';
      s.skillProgress = { 'example-endgame': ['chain-1'] };
      s.paragonProgress = { 'example-endgame': ['board-1'] };
      s.settings.overlayOpacity = 0.7;
      await persistState(directory, s);
      expect((await readState(directory)).state).toEqual(s);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
  it('reports corrupt data without deleting the source', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sanctum-corrupt-'));
    try {
      await fs.writeFile(path.join(directory, 'state.json'), 'bad');
      const loaded = await readState(directory);
      expect(loaded.warning).toBeTruthy();
      expect(await fs.readFile(path.join(directory, 'state.json'), 'utf8')).toBe('bad');
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
  it('migrates v1 state and refuses unsupported versions', () => {
    const old = { ...freshState(), schemaVersion: 1 };
    expect(decodeState(old).schemaVersion).toBe(2);
    expect(() => StateSchema.parse({ ...old, schemaVersion: 77 })).toThrow();
  });
});
describe('actual offline OCR pipeline', () => {
  it('recognizes an original tooltip PNG and yields an endgame recommendation', async () => {
    const result = await recognize(
      await fs.readFile('tests/fixtures/tooltip.png'),
      path.resolve('resources/ocr'),
    );
    const item = parseItem(
      result.text,
      catalogue([levelingExample, endgameExample]),
      result.confidence,
    );
    expect(item.name).toBe('RING OF THE TEMPEST');
    expect(item.affixes.map((a) => a.id)).toContain('critical-strike-chance');
    expect(item.confidence).toBeGreaterThanOrEqual(75);
    expect(evaluate(item, levelingExample, endgameExample).verdict).toBe('STASH FOR ENDGAME');
  }, 60000);
  it('retains low-resolution output for conservative review rather than guessing', async () => {
    const result = await recognize(
      await fs.readFile('tests/fixtures/tooltip-small.png'),
      path.resolve('resources/ocr'),
    );
    const item = parseItem(
      result.text,
      catalogue([levelingExample, endgameExample]),
      result.confidence,
    );
    expect(item.raw.length).toBeGreaterThan(10);
    expect(['STASH FOR ENDGAME', 'NEEDS REVIEW']).toContain(
      evaluate(item, levelingExample, endgameExample).verdict,
    );
  }, 60000);
});
