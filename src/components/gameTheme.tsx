import { useEffect } from 'react';
import { useApp } from '../app/store';
export const gameVariable = (id: string) =>
  '--game-' + id.replace(/^texture\./, '').replaceAll('.', '-');
export function GameTheme() {
  const { state } = useApp();
  const signature = state.assets
    .filter((a) => a.id.startsWith('texture.'))
    .map((a) => a.id + ':' + a.checksum)
    .join('|');
  useEffect(() => {
    const root = document.documentElement;
    const names: string[] = [];
    let cancelled = false;
    root.classList.remove('has-game-assets', 'has-game-icons');
    if (state.settings.gameTheme && window.sanctum) {
      void Promise.all(
        state.assets
          .filter((a) => a.id.startsWith('texture.'))
          .map(async (asset) => {
            const source = await window.sanctum!.readAsset(asset.id);
            if (!cancelled && source) {
              const variable = gameVariable(asset.id);
              names.push(variable);
              root.style.setProperty(variable, `url("${source}")`);
              return asset.id;
            }
            return '';
          }),
      )
        .then((loaded) => {
          if (!cancelled && loaded.includes('texture.panel.frame')) {
            root.classList.add('has-game-assets');
            if (loaded.includes('texture.icon.generic')) root.classList.add('has-game-icons');
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      root.classList.remove('has-game-assets', 'has-game-icons');
      names.forEach((name) => root.style.removeProperty(name));
    };
  }, [state.settings.gameTheme, signature]);
  return null;
}
export function FrameOrnaments() {
  return (
    <span className="game-frame-corners" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
