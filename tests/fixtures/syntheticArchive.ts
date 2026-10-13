import fs from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
// Original binary fixtures authored for the format reader. No Blizzard bytes.
export function syntheticKey(offset: number) {
  const key = Buffer.alloc(16);
  key.writeBigUInt64BE((1n << 32n) | BigInt(offset), 8);
  return key;
}
export function syntheticTvfs(files: { name: string; key: Buffer; length: number }[]) {
  const names: Buffer[] = [],
    spans: Buffer[] = [];
  let vfsOffset = 0;
  files.forEach((file, i) => {
    const name = Buffer.from(file.name),
      node = Buffer.alloc(5);
    node[0] = 255;
    node.writeUInt32BE(vfsOffset, 1);
    names.push(Buffer.from([name.length]), name, node);
    const span = Buffer.alloc(10);
    span[0] = 1;
    span.writeUInt32BE(file.length, 5);
    span[9] = i * 16;
    spans.push(span);
    vfsOffset += span.length;
  });
  const n = Buffer.concat(names),
    s = Buffer.concat(spans),
    k = Buffer.concat(files.map((f) => f.key));
  const header = Buffer.alloc(46);
  header.write('TVFS');
  header[4] = 1;
  header[5] = 46;
  header[6] = 16;
  header.writeUInt32BE(46, 12);
  header.writeUInt32BE(n.length, 16);
  header.writeUInt32BE(46 + n.length, 20);
  header.writeUInt32BE(s.length, 24);
  header.writeUInt32BE(46 + n.length + s.length, 28);
  header.writeUInt32BE(k.length, 32);
  return Buffer.concat([header, n, s, k]);
}
export async function createSyntheticGame(directory: string) {
  const groups = 182,
    headerSize = 12 + groups * 16,
    name = Buffer.from('2DUITiled_HellGothicInsetBorder\0');
  const toc = Buffer.alloc(headerSize + 12 + name.length);
  toc.writeUInt32LE(0xbcde6611);
  toc.writeUInt32LE(groups, 4);
  toc.writeUInt32LE(1, 8 + 44 * 4);
  toc.writeUInt32LE(44, headerSize);
  toc.writeUInt32LE(792350, headerSize + 4);
  name.copy(toc, headerSize + 12);
  const meta = Buffer.alloc(188),
    start = 24,
    base = 28;
  meta.writeUInt32LE(0x44cf00f5);
  meta.writeUInt32LE(1, 4);
  meta.writeUInt32LE(792350, 8);
  meta.writeUInt32LE(164, 12);
  meta.writeUInt32LE(792350, start);
  meta.writeUInt32LE(49, base + 8);
  meta.writeUInt16LE(4, base + 16);
  meta.writeUInt16LE(4, base + 18);
  meta.writeInt32LE(120, base + 68);
  meta.writeInt32LE(8, base + 72);
  meta.writeInt32LE(128, base + 84);
  meta.writeInt32LE(36, base + 88);
  meta.writeUInt32LE(16, 148);
  meta.writeFloatLE(1, 164);
  meta.writeFloatLE(1, 168);
  meta.writeFloatLE(1, 180);
  meta.writeFloatLE(1, 184);
  const shared = Buffer.alloc(8);
  shared.writeUInt32LE(0xabba0003);
  const pixels = Buffer.alloc(16);
  pixels[0] = 255;
  pixels[1] = 255;
  pixels.writeUInt16LE(0xf800, 8);
  pixels.writeUInt16LE(0x001f, 10);
  const values = [
    { name: 'base/coretoc.dat', key: syntheticKey(4096), value: toc },
    { name: 'base/texture-base-global.dat', key: syntheticKey(8192), value: meta },
    { name: 'base/coretocsharedpayloadsmapping.dat', key: syntheticKey(12288), value: shared },
    { name: 'base/payload/792350', key: syntheticKey(16384), value: pixels },
  ];
  const tvfs = syntheticTvfs(values.map((v) => ({ ...v, length: v.value.length })));
  const compressed = deflateSync(tvfs),
    archive = Buffer.alloc(16384 + pixels.length);
  compressed.copy(archive);
  values.forEach((v) => v.value.copy(archive, Number(v.key.readBigUInt64BE(8) & 0xffffffffn)));
  await fs.mkdir(path.join(directory, 'Data', '000'), { recursive: true });
  await fs.writeFile(path.join(directory, 'BuildRevision.txt'), 'synthetic-1');
  await fs.writeFile(path.join(directory, 'Data', '000', '0x0001-meta.dat'), archive);
  await fs.writeFile(
    path.join(directory, 'Data', '.build.config'),
    `vfs-root = ${'0'.repeat(32)} ${syntheticKey(0).toString('hex')}\nvfs-root-size = ${tvfs.length} ${compressed.length}\nkey-layout-index-bits = 2\nkey-layout-0 = 8 14 32 0\n`,
  );
  return directory;
}
