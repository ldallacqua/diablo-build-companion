import { AssetSchema, type Asset } from '../domain/models';
import type { GameLibrary, GameResource } from '../shared/gameAssets';
// Resource handles/recipes only. Pixel data is always read from the user's cache.
export const starterBindings: Record<string, string> = {
  'texture.panel.frame': '0.369421',
  'texture.surface': '1091626.0',
  'texture.divider': '357677.1018983007',
  'texture.button': '125986.621170354',
  'texture.button.primary': '125986.176776604',
  'texture.ornament': '137992.3936225106',
  'texture.icon.close': '125986.3981359596',
  'texture.icon.generic': '357858.3274051761',
  'texture.icon.grid': '125986.2412960056',
  'texture.icon.skills': '357858.3104473500',
  'texture.icon.compare': '125986.3307593890',
  'texture.icon.arrow': '125986.1806189691',
  'texture.icon.check': '125986.2193246336',
  'texture.icon.inventory': '357858.3323054231',
  'texture.icon.paragon': '357858.125965701',
};
export function resourceAsset(id: string, resource: GameResource, build: string): Asset {
  return AssetSchema.parse({
    id,
    category: id.split('.')[0],
    source: `Diablo IV ${resource.name} / local build ${build}`,
    license: 'Blizzard Entertainment artwork; private local use; not redistributable',
    filename: resource.filename,
    checksum: resource.checksum,
    compatiblePatch: '*',
    gameBuild: build,
    resourceKey: resource.key,
    slice: resource.slice,
  });
}
export function starterAssets(library: GameLibrary) {
  const resources = new Map(library.resources.map((r) => [r.key, r]));
  const assets: Asset[] = [];
  for (const [id, key] of Object.entries(starterBindings)) {
    const resource = resources.get(key);
    if (resource) assets.push(resourceAsset(id, resource, library.build));
  }
  const fallback = resources.get('792350.0');
  if (!assets.some((a) => a.id === 'texture.panel.frame') && fallback)
    assets.push(resourceAsset('texture.panel.frame', fallback, library.build));
  return assets;
}
