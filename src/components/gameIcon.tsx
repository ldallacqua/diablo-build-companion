import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../app/store';
import { glyphBounds } from '../services/gameAssets';

export type GameIconName =
  | 'overview'
  | 'inventory'
  | 'skills'
  | 'paragon'
  | 'compare'
  | 'equipment'
  | 'character'
  | 'settings';
type Artwork = { source: string; width: number; height: number; viewBox: string };

async function loadArtwork(id: string, resourceKey?: string): Promise<Artwork | null> {
  const source = await window.sanctum?.readAsset(id);
  if (!source) return null;
  const image = new Image();
  image.src = source;
  await image.decode();
  const { naturalWidth: width, naturalHeight: height } = image;
  if (width * height > 1024 * 1024) return null;
  let bounds = resourceKey ? glyphBounds[resourceKey] : undefined;
  if (!bounds) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, width, height).data;
    let left = width,
      top = height,
      right = -1,
      bottom = -1;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (pixels[(y * width + x) * 4 + 3] > 8) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
    if (right < left) return null;
    bounds = [left, top, right - left + 1, bottom - top + 1];
  }
  return { source, width, height, viewBox: bounds.join(' ') };
}

export function GameIcon({
  name,
  fallback: Fallback,
  size = 24,
}: {
  name: GameIconName;
  fallback: LucideIcon;
  size?: number;
}) {
  const { state } = useApp();
  const id = `texture.icon.${name}`;
  const asset = state.assets.find((a) => a.id === id);
  const [art, setArt] = useState<Artwork | null>(null);
  useEffect(() => {
    let active = true;
    setArt(null);
    if (state.settings.gameTheme && asset)
      void loadArtwork(id, asset.resourceKey)
        .then((value) => {
          if (active) setArt(value);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [state.settings.gameTheme, id, asset?.checksum, asset?.resourceKey]);
  return art ? (
    <svg
      className={`game-icon game-icon-${name}`}
      data-game-icon={name}
      width={size}
      height={size}
      viewBox={art.viewBox}
      aria-hidden="true"
      focusable="false"
    >
      <image href={art.source} width={art.width} height={art.height} />
    </svg>
  ) : (
    <Fallback aria-hidden="true" size={size} />
  );
}
