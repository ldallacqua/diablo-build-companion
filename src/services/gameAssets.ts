import { AssetSchema, type Asset } from '../domain/models';
import type { GameLibrary, GameResource } from '../shared/gameAssets';
import { skillBindings } from './gameSkillIcons';
// Resource handles/recipes only. Pixel data is always read from the user's cache.
export const starterBindings: Record<string, string> = {
  'texture.panel.frame': '0.369421',
  'texture.surface': '1091626.0',
  'texture.divider': '357677.1018983007',
  'texture.button': '125986.2159923079',
  'texture.button.hover': '125986.3787983783',
  'texture.button.pressed': '125986.1987288468',
  'texture.button.primary': '125986.2522874592',
  'texture.button.primary.hover': '125986.2658197453',
  'texture.button.primary.pressed': '125986.3214652442',
  'texture.button.disabled': '125986.176776604',
  'texture.nav.marker': '125986.621170354',
  'texture.ornament': '137992.4176279081',
  'texture.hero.angel': '137992.1884968899',
  'texture.icon.overview': '1633171.1359827906',
  'texture.icon.skills': '1633171.2996547678',
  'texture.icon.compare': '125986.3307593890',
  'texture.icon.inventory': '357858.1880471631',
  'texture.icon.paragon': '1633171.2282930203',
  'texture.icon.settings': '1633171.1871852689',
  'texture.icon.equipment': '357858.2778314487',
  'texture.icon.character': '357858.2286723272',
  'class.barbarian': '1390301.3701249709',
  'class.druid': '1390301.770678670',
  'class.necromancer': '1390301.2606136205',
  'class.rogue': '1390301.1847844600',
  'class.sorcerer': '1390301.3440944301',
  'class.spiritborn': '1390301.465144194',
  'item.ring': '1449763.2061373383',
  'item.amulet': '1449763.202388031',
  'item.helm': '1449763.2061009597',
  'item.chest': '1449763.3580974264',
  'item.gloves': '1449763.3588665509',
  'item.pants': '1449763.3598153405',
  'item.boots': '1449763.3582054718',
  'item.weapon': '1449763.3602502790',
  'item.offhand': '1449763.2900456848',
  ...skillBindings,
};
// Visible bounds, inspected against the original sprites. The icon component uses
// an SVG viewport so transparent atlas padding never makes the glyph microscopic.
// Custom assignments are measured from their alpha instead of using these bounds.
export const glyphBounds: Record<string, [number, number, number, number]> = {
  '1314234.767365689': [23, 19, 89, 99],
  '125986.2192140018': [0, 0, 37, 40],
  '125986.3307593890': [6, 3, 55, 62],
  '357858.1880471631': [14, 6, 72, 88],
  '357858.3274051761': [0, 0, 131, 126],
  '357858.2778314487': [0, 0, 133, 128],
  '357858.2286723272': [6, 6, 94, 88],
  '1633171.1359827906': [6, 33, 90, 39],
  '1633171.2996547678': [16, 10, 69, 88],
  '1633171.2282930203': [4, 5, 94, 94],
  '1633171.1871852689': [10, 21, 82, 67],
};
const legacyBindings: Record<string, string> = {
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
export function upgradeStarterTheme(assets: Asset[], library: GameLibrary): Asset[] {
  if (
    !assets.some((a) => a.id === 'texture.icon.generic' && a.resourceKey === legacyBindings[a.id])
  )
    return assets;
  const preserved = assets.filter(
    (a) => !legacyBindings[a.id] || a.resourceKey !== legacyBindings[a.id],
  );
  const ids = new Set(preserved.map((a) => a.id));
  return [...preserved, ...starterAssets(library).filter((a) => !ids.has(a.id))];
}
export function applyStarterTheme(assets: Asset[], library: GameLibrary): Asset[] {
  const defaults = starterAssets(library);
  const managed = new Set(
    [...Object.keys(legacyBindings), ...Object.keys(starterBindings)].filter((id) =>
      id.startsWith('texture.'),
    ),
  );
  const preserved = assets.filter((a) => !managed.has(a.id) && !a.id.startsWith('texture.corner.'));
  const ids = new Set(preserved.map((a) => a.id));
  return [...preserved, ...defaults.filter((a) => !ids.has(a.id))];
}
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
