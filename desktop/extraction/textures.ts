import { deflateSync } from 'node:zlib';

// SNO/combined-meta layouts: WiseOwl.Casc, MIT; see extraction notices.
export interface SpriteFrame {
  handle: number;
  x: number;
  y: number;
  width: number;
  height: number;
  inner: number[];
}
export interface TextureInfo {
  id: number;
  name: string;
  width: number;
  height: number;
  format: number;
  offset: number;
  size: number;
  frames: SpriteFrame[];
}
export function textureNames(toc: Buffer) {
  const modern = toc.readUInt32LE(0) === 0xbcde6611;
  const base = modern ? 8 : 4,
    groups = toc.readUInt32LE(modern ? 4 : 0);
  if (groups < 45 || groups > 1000 || base + groups * 16 + 4 > toc.length)
    throw new Error('Invalid CoreTOC header.');
  const count = toc.readUInt32LE(base + 44 * 4);
  const start = toc.readUInt32LE(base + groups * 4 + 44 * 4) + (modern ? 12 : 8) + groups * 16;
  const strings = start + count * 12;
  if (strings > toc.length) throw new Error('Invalid texture catalogue.');
  const result = new Map<number, string>();
  for (let i = 0; i < count; i++) {
    const at = start + i * 12,
      nameAt = strings + toc.readUInt32LE(at + 8),
      end = toc.indexOf(0, nameAt);
    if (nameAt >= strings && end >= nameAt && end - nameAt < 512)
      result.set(toc.readUInt32LE(at + 4), toc.toString('utf8', nameAt, end));
  }
  return result;
}
export function textureDefinitions(bundle: Buffer, names: Map<number, string>) {
  if (bundle.readUInt32LE(0) !== 0x44cf00f5)
    throw new Error('Unsupported combined texture metadata.');
  const count = bundle.readUInt32LE(4);
  if (count > 1000000 || 8 + count * 8 > bundle.length) throw new Error('Invalid texture index.');
  const output: TextureInfo[] = [];
  let cursor = 8 + count * 8;
  for (let i = 0; i < count; i++) {
    const id = bundle.readUInt32LE(8 + i * 8),
      length = bundle.readUInt32LE(12 + i * 8);
    const start = Math.ceil(cursor / 8) * 8 + 8,
      base = start + 4;
    cursor = start + length;
    if (cursor > bundle.length) throw new Error('Truncated texture descriptor.');
    const name = names.get(id);
    if (!name || !/^2DUI/i.test(name) || length < 100 || bundle.readUInt32LE(start) !== id)
      continue;
    const width = bundle.readUInt16LE(base + 16),
      height = bundle.readUInt16LE(base + 18);
    if (!width || !height || width > 32768 || height > 32768 || width * height > 32 * 1024 * 1024)
      continue;
    const array = (field: number, stride: number) => {
      const at = start + bundle.readInt32LE(base + field + 4),
        bytes = bundle.readInt32LE(base + field + 8);
      if (at < start || bytes < 0 || at + bytes > cursor || bytes % stride)
        throw new Error('Invalid texture array.');
      return { at, count: bytes / stride };
    };
    const mips = array(64, 8),
      frames = array(80, 36);
    const sprites: SpriteFrame[] = [];
    for (let j = 0; j < frames.count; j++) {
      const at = frames.at + j * 36;
      const uv = Array.from({ length: 8 }, (_, k) => bundle.readFloatLE(at + 4 + k * 4));
      if (uv.some((v) => !Number.isFinite(v) || v < 0 || v > 1.001)) continue;
      const x = Math.max(0, Math.round(uv[0] * width)),
        y = Math.max(0, Math.round(uv[1] * height));
      const right = Math.min(width, Math.round(uv[2] * width)),
        bottom = Math.min(height, Math.round(uv[3] * height));
      if (right <= x || bottom <= y) continue;
      sprites.push({
        handle: bundle.readUInt32LE(at),
        x,
        y,
        width: right - x,
        height: bottom - y,
        inner: uv.slice(4).map((v, k) => Math.round(v * (k % 2 ? height : width))),
      });
    }
    output.push({
      id,
      name,
      width,
      height,
      format: bundle.readUInt32LE(base + 8),
      offset: mips.count ? bundle.readUInt32LE(mips.at) : 0,
      size: mips.count ? bundle.readUInt32LE(mips.at + 4) : 0,
      frames: sprites,
    });
  }
  return output;
}
export function sharedPayloads(data: Buffer) {
  if (data.length < 8 || data.readUInt32LE(0) !== 0xabba0003)
    throw new Error('Invalid shared-payload map.');
  const count = data.readUInt32LE(4);
  if (8 + count * 8 > data.length) throw new Error('Truncated shared-payload map.');
  return new Map(
    Array.from({ length: count }, (_, i) => [
      data.readUInt32LE(8 + i * 8),
      data.readUInt32LE(12 + i * 8),
    ]),
  );
}
function rgb565(value: number) {
  return [
    Math.round((((value >> 11) & 31) * 255) / 31),
    Math.round((((value >> 5) & 63) * 255) / 63),
    Math.round(((value & 31) * 255) / 31),
    255,
  ];
}
export function decodeTexture(info: TextureInfo, payload: Buffer) {
  const { width, height, format } = info;
  if (width * height > 32 * 1024 * 1024)
    throw new Error('Texture exceeds the decode pixel budget.');
  const rgba = Buffer.alloc(width * height * 4);
  const bc1 = [9, 10, 46, 47].includes(format),
    bc3 = [12, 49].includes(format);
  const rawRgba = [0, 45].includes(format),
    rawR = [7, 23].includes(format);
  if (!bc1 && !bc3 && !rawRgba && !rawR)
    throw new Error(`Unsupported texture codec ${format}; resource skipped.`);
  const unit = bc1 ? 8 : bc3 ? 16 : rawRgba ? 4 : 1;
  const rows = bc1 || bc3 ? Math.ceil(height / 4) : height;
  const minimumPitch = bc1 || bc3 ? Math.ceil(width / 4) * unit : width * unit;
  const storedSize = info.size & 0x3fffffff;
  const pitch = storedSize && storedSize % rows === 0 ? storedSize / rows : minimumPitch;
  if (pitch < minimumPitch || pitch * rows + info.offset > payload.length)
    throw new Error('Texture mip payload is truncated.');
  if (rawRgba || rawR) {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const src = info.offset + y * pitch + x * unit,
          dst = (y * width + x) * 4;
        if (rawRgba) payload.copy(rgba, dst, src, src + 4);
        else {
          rgba[dst] = rgba[dst + 1] = rgba[dst + 2] = 255;
          rgba[dst + 3] = payload[src];
        }
      }
    return rgba;
  }
  for (let by = 0; by < rows; by++)
    for (let bx = 0; bx < Math.ceil(width / 4); bx++) {
      const at = info.offset + by * pitch + bx * unit,
        color = at + (bc3 ? 8 : 0);
      const c0 = payload.readUInt16LE(color),
        c1 = payload.readUInt16LE(color + 2);
      const palette = [rgb565(c0), rgb565(c1)];
      if (c0 > c1 || bc3) {
        palette.push(
          palette[0].map((v, i) => (i === 3 ? 255 : Math.floor((2 * v + palette[1][i]) / 3))),
        );
        palette.push(
          palette[0].map((v, i) => (i === 3 ? 255 : Math.floor((v + 2 * palette[1][i]) / 3))),
        );
      } else {
        palette.push(
          palette[0].map((v, i) => (i === 3 ? 255 : Math.floor((v + palette[1][i]) / 2))),
        );
        palette.push([0, 0, 0, 0]);
      }
      const indices = payload.readUInt32LE(color + 4);
      const alpha = bc3 ? [payload[at], payload[at + 1]] : [255, 255];
      if (bc3) {
        const steps = alpha[0] > alpha[1] ? 7 : 5;
        for (let i = 1; i < steps; i++)
          alpha.push(Math.floor(((steps - i) * alpha[0] + i * alpha[1]) / steps));
        if (steps === 5) alpha.push(0, 255);
      }
      const alphaBits = bc3 ? payload.readUIntLE(at + 2, 6) : 0;
      for (let i = 0; i < 16; i++) {
        const x = bx * 4 + (i % 4),
          y = by * 4 + Math.floor(i / 4);
        if (x >= width || y >= height) continue;
        const dst = (y * width + x) * 4,
          pixel = palette[(indices >>> (i * 2)) & 3];
        rgba[dst] = pixel[0];
        rgba[dst + 1] = pixel[1];
        rgba[dst + 2] = pixel[2];
        rgba[dst + 3] = bc3 ? alpha[Math.floor(alphaBits / 2 ** (i * 3)) & 7] : pixel[3];
      }
    }
  return rgba;
}
export function cropRgba(
  rgba: Buffer,
  width: number,
  frame: Pick<SpriteFrame, 'x' | 'y' | 'width' | 'height'>,
) {
  const out = Buffer.alloc(frame.width * frame.height * 4);
  for (let y = 0; y < frame.height; y++)
    rgba.copy(
      out,
      y * frame.width * 4,
      ((frame.y + y) * width + frame.x) * 4,
      ((frame.y + y) * width + frame.x + frame.width) * 4,
    );
  return out;
}
export function encodePng(rgba: Buffer, width: number, height: number) {
  if (rgba.length !== width * height * 4) throw new Error('Invalid RGBA dimensions.');
  const chunk = (name: string, data: Buffer) => {
    const type = Buffer.from(name),
      content = Buffer.concat([type, data]);
    let crc = 0xffffffff;
    for (const byte of content) {
      crc ^= byte;
      for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length);
    type.copy(result, 4);
    data.copy(result, 8);
    result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++)
    rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
