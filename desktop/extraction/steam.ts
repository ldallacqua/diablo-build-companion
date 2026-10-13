import fs from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

// Format references: overtools/TACTLib (MIT), WiseOwl.Casc (MIT).
// This reader implements the Steam static-container layout, not executable code.
const MAX_FILE = 512 * 1024 * 1024;
export interface Span {
  key: Buffer;
  offset: number;
  length: number;
}
export interface ArchiveEntry {
  path: string;
  spans: Span[];
}
export class EncryptedContentError extends Error {}
export function parseConfig(text: string) {
  return new Map(
    text
      .split(/\r?\n/)
      .filter((line) => /^\w[\w-]*\s*=/.test(line))
      .map((line) => {
        const split = line.indexOf('=');
        return [
          line.slice(0, split).trim(),
          line
            .slice(split + 1)
            .trim()
            .split(/\s+/),
        ];
      }),
  );
}
function checked(size: number, maximum = MAX_FILE) {
  if (!Number.isSafeInteger(size) || size < 0 || size > maximum)
    throw new Error('Archive size exceeds the supported limit.');
  return size;
}
export function storageLocation(key: Buffer, config: Map<string, string[]>) {
  if (key.length !== 16) throw new Error('Steam entries require a full 16-byte storage key.');
  const indexBits = Number(config.get('key-layout-index-bits')?.[0]);
  if (!Number.isInteger(indexBits) || indexBits < 1 || indexBits > 8)
    throw new Error('Invalid archive key layout.');
  const value = key.readBigUInt64BE(8);
  let cursor = 56;
  const take = (bits: number) => {
    if (!Number.isInteger(bits) || bits < 0 || bits > cursor)
      throw new Error('Invalid archive bit field.');
    cursor -= bits;
    return Number((value >> BigInt(cursor)) & ((1n << BigInt(bits)) - 1n));
  };
  const index = take(indexBits);
  const layout = config.get(`key-layout-${index}`)?.map(Number);
  if (!layout || layout.length < 4 || ![0, 4096].includes(layout[3]))
    throw new Error('Unsupported Steam archive layout.');
  const chunk = take(layout[0]),
    archive = take(layout[1]),
    rawOffset = take(layout[2]);
  return {
    chunk,
    archive,
    offset: rawOffset * (layout[3] || 1),
    payload: layout[3] !== 0,
    loose: layout[2] === 0,
  };
}
export function decodeBlte(raw: Buffer): Buffer {
  if (raw.toString('ascii', 0, 4) !== 'BLTE') throw new Error('Invalid BLTE container.');
  const header = raw.readUInt32BE(4);
  const decode = (chunk: Buffer) => {
    if (chunk[0] === 69)
      throw new EncryptedContentError(
        'Encrypted archive entry skipped; no key/decryption support is included.',
      );
    if (chunk[0] === 78) return chunk.subarray(1);
    if (chunk[0] === 90) return inflateSync(chunk.subarray(1), { maxOutputLength: MAX_FILE });
    throw new Error(`Unsupported archive compression ${chunk[0]}.`);
  };
  if (header === 0) return decode(raw.subarray(8));
  const count = raw.readUIntBE(9, 3);
  if (count > 200000 || header < 12 + count * 24 || header > raw.length)
    throw new Error('Invalid BLTE block table.');
  let cursor = header,
    total = 0;
  const chunks: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    const size = raw.readUInt32BE(12 + i * 24),
      expected = raw.readUInt32BE(16 + i * 24);
    checked((total += expected));
    if (cursor + size > raw.length) throw new Error('Truncated BLTE block.');
    const decoded = decode(raw.subarray(cursor, cursor + size));
    if (decoded.length !== expected) throw new Error('BLTE decoded length mismatch.');
    chunks.push(decoded);
    cursor += size;
  }
  return Buffer.concat(chunks, total);
}
export function parseTvfs(data: Buffer): ArchiveEntry[] {
  if (data.length < 38 || data.toString('ascii', 0, 4) !== 'TVFS' || data[4] !== 1)
    throw new Error('Unsupported TVFS manifest.');
  const table = (field: number) => {
    const start = data.readUInt32BE(field),
      size = data.readUInt32BE(field + 4);
    if (start + size > data.length) throw new Error('TVFS table is out of range.');
    return data.subarray(start, start + size);
  };
  const names = table(12),
    spans = table(20),
    keys = table(28),
    keySize = data[6];
  const cftSize =
    keys.length > 0xffffff ? 4 : keys.length > 0xffff ? 3 : keys.length > 0xff ? 2 : 1;
  const files: ArchiveEntry[] = [];
  const visit = (start: number, end: number, prefix: string, depth: number) => {
    if (depth > 80) throw new Error('TVFS nesting limit exceeded.');
    let pos = start,
      chain = prefix;
    while (pos < end) {
      let name = chain;
      if (names[pos] === 0) {
        name += '/';
        pos++;
      }
      if (names[pos] !== 255 && pos < end) {
        const length = names[pos++];
        if (pos + length > end) throw new Error('Truncated TVFS name.');
        name += names.toString('utf8', pos, pos + length);
        pos += length;
      }
      if (names[pos] === 0) {
        name += '/';
        pos++;
      }
      if (names[pos] !== 255) {
        if (pos >= end) throw new Error('Incomplete TVFS prefix.');
        chain = name.endsWith('/') ? name : name + '/';
        continue;
      }
      if (pos + 5 > end) throw new Error('Truncated TVFS node.');
      const node = names.readUInt32BE(pos + 1);
      pos += 5;
      if (node >= 0x80000000) {
        const length = node - 0x80000000 - 4;
        if (length < 0 || pos + length > end) throw new Error('TVFS folder is out of range.');
        visit(pos, pos + length, name, depth + 1);
        pos += length;
      } else {
        if (node >= spans.length) throw new Error('TVFS span is out of range.');
        const count = spans[node],
          parts: Span[] = [];
        if (!count || count > 224) throw new Error('Invalid TVFS span count.');
        for (let i = 0; i < count; i++) {
          const at = node + 1 + i * (8 + cftSize);
          if (at + 8 + cftSize > spans.length) throw new Error('Truncated TVFS span.');
          const keyAt = spans.readUIntBE(at + 8, cftSize);
          if (keyAt + keySize > keys.length) throw new Error('TVFS key is out of range.');
          parts.push({
            key: keys.subarray(keyAt, keyAt + keySize),
            offset: spans.readUInt32BE(at),
            length: spans.readUInt32BE(at + 4),
          });
        }
        const clean = name.replaceAll('\\', '/').replace(/\/+$/g, '').replace(/^\/+/, '');
        if (clean.split('/').some((p) => p === '..' || p === '.'))
          throw new Error('Invalid archive path.');
        files.push({ path: clean, spans: parts });
      }
      chain = prefix;
    }
  };
  visit(0, names.length, '', 0);
  return files;
}
export class SteamArchive {
  readonly config: Map<string, string[]>;
  readonly entries = new Map<string, ArchiveEntry>();
  readonly root: string;
  readonly version: string;
  constructor(installation: string, progress: (message: string) => void = () => {}) {
    this.root = fs.realpathSync(installation);
    const dataRoot = path.join(this.root, 'Data');
    const configText = fs.readFileSync(path.join(dataRoot, '.build.config'), 'utf8');
    this.config = parseConfig(configText);
    this.version = fs.readFileSync(path.join(this.root, 'BuildRevision.txt'), 'utf8').trim();
    const manifests = new Map<string, { key: Buffer; length: number }>();
    for (const [name, values] of this.config)
      if (/^vfs-(root|\d+)$/.test(name)) {
        manifests.set(values[1], {
          key: Buffer.from(values[1], 'hex'),
          length: Number(this.config.get(`${name}-size`)?.[0]),
        });
      }
    const rootKey = this.config.get('vfs-root')?.[1];
    if (!rootKey || !manifests.has(rootKey)) throw new Error('Missing Steam root manifest.');
    const visited = new Set<string>();
    const walk = (key: string, prefix: string, depth: number) => {
      if (depth > 30 || visited.has(`${key}:${prefix}`))
        throw new Error('Cyclic archive manifest.');
      visited.add(`${key}:${prefix}`);
      const info = manifests.get(key)!;
      const parsed = parseTvfs(this.readStorage(info.key, info.length));
      for (const entry of parsed) {
        const fullPath = [prefix, entry.path].filter(Boolean).join('/');
        const child = entry.spans.length === 1 ? entry.spans[0].key.toString('hex') : '';
        if (manifests.has(child)) walk(child, fullPath, depth + 1);
        else this.entries.set(fullPath.toLowerCase(), { ...entry, path: fullPath });
      }
      progress(`Indexed ${this.entries.size.toLocaleString()} local archive entries`);
    };
    walk(rootKey, '', 0);
  }
  readStorage(key: Buffer, expected: number) {
    checked(expected);
    const location = storageLocation(key, this.config);
    const archive = location.archive.toString(16).padStart(4, '0');
    const suffixes = location.loose
      ? [
          `${location.archive.toString(16)}-child.dat`,
          `0x${archive}-child.dat`,
          `0x${archive}-payload.dat`,
        ]
      : [`0x${archive}-${location.payload ? 'payload' : 'meta'}.dat`];
    const candidates = [
      ...new Set([
        location.chunk.toString().padStart(3, '0'),
        location.chunk.toString(16).padStart(3, '0'),
      ]),
    ].flatMap((chunk) => suffixes.map((suffix) => path.join(this.root, 'Data', chunk, suffix)));
    const filename = candidates.find((name) => fs.existsSync(name));
    if (!filename) throw new Error('A required archive is not installed locally.');
    const resolved = fs.realpathSync(filename);
    if (!resolved.startsWith(path.join(this.root, 'Data') + path.sep))
      throw new Error('Archive resolves outside the installation.');
    const fd = fs.openSync(resolved, 'r');
    try {
      const stat = fs.fstatSync(fd);
      if (location.offset >= stat.size) throw new Error('Archive offset is out of range.');
      const read = (size: number, offset = location.offset) => {
        const length = Math.min(checked(size), stat.size - offset);
        const buffer = Buffer.alloc(length);
        const count = fs.readSync(fd, buffer, 0, length, offset);
        if (count !== length) throw new Error('Archive changed during reading.');
        return buffer;
      };
      const head = read(12);
      let raw: Buffer;
      if (head.toString('ascii', 0, 4) === 'BLTE') {
        const header = head.readUInt32BE(4);
        let size = expected + 65536;
        if (header) {
          const count = head.readUIntBE(9, 3);
          if (count > 200000 || header < 12 + count * 24) throw new Error('Invalid BLTE header.');
          const table = read(header);
          size = header;
          for (let i = 0; i < count; i++) size += table.readUInt32BE(12 + i * 24);
        }
        raw = decodeBlte(read(size));
      } else if (head[0] === 0x78)
        raw = inflateSync(read(expected + 65536), { maxOutputLength: MAX_FILE });
      else raw = read(expected);
      if (raw.length < expected) throw new Error('Archive content is truncated.');
      return raw.subarray(0, expected);
    } finally {
      fs.closeSync(fd);
    }
  }
  read(name: string) {
    const entry = this.entries.get(name.replaceAll('\\', '/').toLowerCase());
    if (!entry) throw new Error(`Local archive entry not found: ${name}`);
    const length = checked(Math.max(...entry.spans.map((p) => p.offset + p.length)));
    const result = Buffer.alloc(length);
    for (const span of entry.spans)
      this.readStorage(span.key, span.length).copy(result, span.offset);
    return result;
  }
}
