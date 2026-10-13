import type { Asset } from '../domain/models';
export function resolveAsset(id: string, manifest: Asset[], patch: string): Asset | undefined {
  return manifest.find(
    (a) => a.id === id && (a.compatiblePatch === '*' || a.compatiblePatch === patch),
  );
}
export function fallbackAsset(id: string): 'spark' | 'sword' | 'shield' | 'diamond' {
  return id.startsWith('skill.')
    ? 'spark'
    : id.startsWith('item.')
      ? 'sword'
      : id.startsWith('class.')
        ? 'shield'
        : 'diamond';
}
