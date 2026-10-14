import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { GameLibrarySchema } from '../../src/shared/gameAssets';
import { SteamArchive, EncryptedContentError } from './steam';
import { composeTooltipFrame } from './frame';
import {
  textureNames,
  textureDefinitions,
  sharedPayloads,
  decodeTexture,
  encodePng,
  cropRgba,
  type TextureInfo,
} from './textures';

export interface GameResource {
  key: string;
  name: string;
  sno: number;
  handle?: number;
  width: number;
  height: number;
  filename: string;
  checksum: string;
  slice?: number[];
  derived?: boolean;
}
export interface GameLibrary {
  schemaVersion: 1;
  build: string;
  extractedAt: string;
  resources: GameResource[];
  skipped: { name: string; reason: string }[];
}
export const defaultTextureNames = [
  '2DUI_Frames',
  '2DUI_Frames_Panel',
  '2DUI_Frames_Modal',
  '2DUI_Buttons',
  '2DUITiled_TooltipFrame',
  '2DUITiled_HellGothicBase',
  '2DUITiled_HellGothicInsetBorder',
  '2DUITiled_HorizontalDivider',
  '2DUITiled_FrameEdgeVertical',
  '2DUITiled_StoneBaseTile',
  '2DUI_InventoryIcons',
  '2DUI_InventoryTabIcons',
  '2DUI_ClassIcons',
  '2DUI_PaperDoll_EmptySlotIcons',
  '2DUI_Skills_Sorceress',
  '2DUI_Skills_Barbarian',
  '2DUI_Skills_Rogue',
  '2DUI_Skills_Druid',
  '2DUI_Skills_Necromancer',
  '2DUI_SkillTree',
  '2DUI_ParagonNodesIcons_Generic',
  '2DUI_Aspect_Icons',
];
export function inspectGame(installation: string, progress: (message: string) => void = () => {}) {
  const archive = new SteamArchive(installation, progress);
  progress('Reading the local texture catalogue');
  const names = textureNames(archive.read('base/coretoc.dat'));
  const textures = textureDefinitions(archive.read('base/texture-base-global.dat'), names);
  const shared = sharedPayloads(archive.read('base/coretocsharedpayloadsmapping.dat'));
  return { archive, textures, shared };
}
export function extractGame(
  installation: string,
  directory: string,
  selectedNames = defaultTextureNames,
  progress: (message: string) => void = () => {},
) {
  let output = path.resolve(directory);
  const pending: string[] = [];
  while (!fs.existsSync(output)) {
    pending.unshift(path.basename(output));
    output = path.dirname(output);
  }
  output = path.join(fs.realpathSync(output), ...pending);
  const game = fs.realpathSync(installation);
  const inside = (child: string, parent: string) => {
    const relative = path.relative(parent, child);
    return (
      relative === '' ||
      (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))
    );
  };
  if (
    output === path.parse(output).root ||
    inside(output, game) ||
    inside(output, fs.realpathSync(path.join(game, 'Data')))
  )
    throw new Error('The private cache must be outside the game installation.');
  const repo = path.resolve(__dirname, '..');
  if (inside(output, repo))
    throw new Error('Extracted assets must be outside the application/repository directory.');
  for (let current = output; ; current = path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.git')))
      throw new Error('Extracted assets must be outside every Git repository.');
    if (current === path.parse(current).root) break;
  }
  fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
  if (!inside(fs.realpathSync(path.join(output, 'assets')), output))
    throw new Error('Private asset directory resolves outside the cache.');
  const { archive, textures, shared } = inspectGame(installation, progress);
  const requested = new Set(selectedNames.map((n) => n.toLowerCase()));
  if (requested.size > 150) throw new Error('Select at most 150 UI atlases per extraction.');
  const library: GameLibrary = {
    schemaVersion: 1,
    build: archive.version,
    extractedAt: new Date().toISOString(),
    resources: [],
    skipped: [],
  };
  const previousPath = path.join(output, 'game-library.json');
  if (fs.existsSync(previousPath)) {
    try {
      const previous = GameLibrarySchema.parse(JSON.parse(fs.readFileSync(previousPath, 'utf8')));
      if (previous.schemaVersion === 1 && previous.build === library.build)
        library.resources = previous.resources.filter(
          (r) => !requested.has(r.name.split(' / ')[0].toLowerCase()),
        );
    } catch {
      /* Replace an invalid private index. */
    }
  }
  let bytesWritten = 0;
  const save = (
    png: Buffer,
    info: TextureInfo,
    width: number,
    height: number,
    frame?: number,
    slice?: number[],
    derived = false,
  ) => {
    bytesWritten += png.length;
    if (bytesWritten > 300 * 1024 * 1024)
      throw new Error('Private cache extraction budget exceeded.');
    const checksum = createHash('sha256').update(png).digest('hex'),
      filename = checksum + '.png';
    const destination = path.join(output, 'assets', filename);
    if (fs.existsSync(destination)) {
      if (
        !fs.lstatSync(destination).isFile() ||
        createHash('sha256').update(fs.readFileSync(destination)).digest('hex') !== checksum
      )
        throw new Error('Existing private asset failed integrity validation.');
    } else fs.writeFileSync(destination, png, { flag: 'wx' });
    library.resources.push({
      key: derived ? `0.${info.id}` : `${info.id}${frame === undefined ? '' : '.' + frame}`,
      name: `${info.name}${derived ? ' / assembled frame' : frame === undefined ? '' : ' / ' + frame}`,
      sno: info.id,
      handle: frame,
      width,
      height,
      filename,
      checksum,
      slice,
      derived: derived || undefined,
    });
  };
  for (const info of textures.filter((t) => requested.has(t.name.toLowerCase()))) {
    progress(`Extracting ${info.name}`);
    try {
      let source = info.id;
      const visited = new Set<number>();
      while (shared.has(source)) {
        if (visited.has(source)) throw new Error('Cyclic shared texture payload.');
        visited.add(source);
        source = shared.get(source)!;
      }
      const payload = archive.read(`base/payload/${source}`);
      const rgba = decodeTexture(info, payload);
      save(encodePng(rgba, info.width, info.height), info, info.width, info.height);
      for (const frame of info.frames) {
        const [left, top, right, bottom] = frame.inner;
        const slice =
          left >= frame.x &&
          top >= frame.y &&
          right <= frame.x + frame.width &&
          bottom <= frame.y + frame.height &&
          right > left &&
          bottom > top &&
          (left > frame.x ||
            top > frame.y ||
            right < frame.x + frame.width ||
            bottom < frame.y + frame.height)
            ? [
                top - frame.y,
                frame.x + frame.width - right,
                frame.y + frame.height - bottom,
                left - frame.x,
              ]
            : undefined;
        save(
          encodePng(cropRgba(rgba, info.width, frame), frame.width, frame.height),
          info,
          frame.width,
          frame.height,
          frame.handle,
          slice,
        );
      }
      const composed = composeTooltipFrame(info, rgba);
      if (composed)
        save(encodePng(composed, 171, 171), info, 171, 171, undefined, [28, 28, 28, 28], true);
    } catch (error) {
      library.skipped.push({
        name: info.name,
        reason:
          error instanceof EncryptedContentError
            ? 'Encrypted content'
            : error instanceof Error
              ? error.message
              : 'Unsupported resource',
      });
    }
  }
  for (const name of selectedNames)
    if (!textures.some((t) => t.name.toLowerCase() === name.toLowerCase()))
      library.skipped.push({ name, reason: 'Not present in this installed build' });
  const temporary = previousPath + '.' + randomUUID() + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(library, null, 2), { flag: 'wx' });
  fs.renameSync(temporary, previousPath);
  progress(`Ready: ${library.resources.length} private resources`);
  return library;
}
