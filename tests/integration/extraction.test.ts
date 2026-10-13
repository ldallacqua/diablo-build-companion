import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import {
  SteamArchive,
  decodeBlte,
  parseTvfs,
  parseConfig,
  storageLocation,
  EncryptedContentError,
} from '../../desktop/extraction/steam';
import { decodeTexture, encodePng } from '../../desktop/extraction/textures';
import { extractGame } from '../../desktop/extraction/library';
import { createSyntheticGame, syntheticKey, syntheticTvfs } from '../fixtures/syntheticArchive';
import { starterAssets } from '../../src/services/gameAssets';
import { composeTooltipFrame } from '../../desktop/extraction/frame';
describe('local Steam archive extraction', () => {
  it('reads real archive structures, writes a private PNG cache and leaves the source unchanged', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sanctum-archive-'));
    try {
      const game = await createSyntheticGame(path.join(root, 'game')),
        output = path.join(root, 'cache');
      const original = await fs.readFile(path.join(game, 'Data', '000', '0x0001-meta.dat'));
      const reader = new SteamArchive(game);
      expect(reader.read('BASE/CoreTOC.dat').readUInt32LE(0)).toBe(0xbcde6611);
      const result = extractGame(game, output);
      expect(result.resources).toHaveLength(2);
      expect(result.build).toBe('synthetic-1');
      expect(starterAssets(result).some((a) => a.id === 'texture.panel.frame')).toBe(true);
      const image = result.resources[0],
        png = await fs.readFile(path.join(output, 'assets', image.filename));
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(createHash('sha256').update(png).digest('hex')).toBe(image.checksum);
      expect(await fs.readFile(path.join(game, 'Data', '000', '0x0001-meta.dat'))).toEqual(
        original,
      );
      expect(() => extractGame(game, path.join(game, 'private-cache'))).toThrow('outside');
      expect(() => extractGame(game, path.resolve('private-assets'))).toThrow('outside');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
  it('handles compressed and uncompressed BLTE while refusing encrypted blocks', () => {
    const header = Buffer.from('424c544500000000', 'hex');
    expect(decodeBlte(Buffer.concat([header, Buffer.from('Noriginal')])).toString()).toBe(
      'original',
    );
    expect(
      decodeBlte(
        Buffer.concat([header, Buffer.from('Z'), deflateSync(Buffer.from('original'))]),
      ).toString(),
    ).toBe('original');
    expect(() => decodeBlte(Buffer.concat([header, Buffer.from('Eprivate')]))).toThrow(
      EncryptedContentError,
    );
  });
  it('rejects path traversal, truncated manifests and invalid storage layouts', () => {
    const fixture = syntheticTvfs([{ name: '../private', key: syntheticKey(0), length: 4 }]);
    expect(() => parseTvfs(fixture)).toThrow('Invalid archive path');
    expect(() => parseTvfs(fixture.subarray(0, 40))).toThrow();
    expect(() =>
      storageLocation(syntheticKey(0), parseConfig('key-layout-index-bits = 9')),
    ).toThrow();
  });
  it('decodes BC3 alpha and padded row pitch without mixing adjacent rows', () => {
    const payload = Buffer.alloc(64);
    for (const [offset, color] of [
      [0, 0xf800],
      [32, 0x07e0],
    ]) {
      payload[offset] = 255;
      payload[offset + 1] = 255;
      payload.writeUInt16LE(color, offset + 8);
    }
    const rgba = decodeTexture(
      { id: 1, name: 'original', width: 4, height: 8, format: 49, size: 64, offset: 0, frames: [] },
      payload,
    );
    expect([...rgba.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...rgba.subarray(4 * 4 * 4, 4 * 4 * 4 + 4)]).toEqual([0, 255, 0, 255]);
    expect(encodePng(rgba, 4, 8).readUInt32BE(16)).toBe(4);
    expect(() =>
      decodeTexture(
        { id: 1, name: '', width: 4, height: 8, format: 50, size: 64, offset: 0, frames: [] },
        payload,
      ),
    ).toThrow('Unsupported');
  });
  it('assembles original border pieces without introducing pixels into the centre', () => {
    const pieces = [
      [3617083868, 0, 0, 28, 28],
      [1477447807, 28, 0, 115, 28],
      [2976791087, 143, 0, 28, 28],
      [1686618293, 0, 28, 28, 115],
      [2511313384, 143, 28, 28, 115],
      [3281059262, 0, 143, 28, 28],
      [4146734621, 28, 143, 115, 28],
      [477913681, 143, 143, 28, 28],
    ];
    const rgba = Buffer.alloc(171 * 171 * 4, 255);
    const info = {
      id: 369421,
      name: '2DUITiled_TooltipFrame',
      width: 171,
      height: 171,
      format: 0,
      offset: 0,
      size: rgba.length,
      frames: pieces.map(([handle, x, y, width, height]) => ({
        handle,
        x,
        y,
        width,
        height,
        inner: [],
      })),
    };
    const frame = composeTooltipFrame(info, rgba)!;
    expect([...frame.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
    expect([...frame.subarray((85 * 171 + 85) * 4, (85 * 171 + 85) * 4 + 4)]).toEqual([0, 0, 0, 0]);
    expect(composeTooltipFrame({ ...info, frames: info.frames.slice(1) }, rgba)).toBeNull();
  });
});
