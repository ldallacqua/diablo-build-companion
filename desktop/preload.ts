import { contextBridge, ipcRenderer } from 'electron';
const listen = (channel: string, fn: (value: unknown) => void) => {
  const cb = (_event: Electron.IpcRendererEvent, value: unknown) => fn(value);
  ipcRenderer.on(channel, cb);
  return () => ipcRenderer.removeListener(channel, cb);
};
contextBridge.exposeInMainWorld('sanctum', {
  load: () => ipcRenderer.invoke('state:load'),
  save: (state: unknown) => ipcRenderer.invoke('state:save', state),
  applySettings: (settings: unknown) => ipcRenderer.invoke('settings:apply', settings),
  displays: () => ipcRenderer.invoke('displays:list'),
  capture: () => ipcRenderer.invoke('capture:scan'),
  scanImage: (image: string) => ipcRenderer.invoke('image:scan', image),
  toggleOverlay: () => ipcRenderer.invoke('overlay:toggle'),
  resizeOverlay: (height: number) => ipcRenderer.invoke('overlay:resize', height),
  showMain: () => ipcRenderer.invoke('overlay:main'),
  openLink: (url: string) => ipcRenderer.invoke('link:open', url),
  importAsset: (meta: unknown) => ipcRenderer.invoke('asset:import', meta),
  readAsset: (id: string) => ipcRenderer.invoke('asset:read', id),
  gameLibrary: () => ipcRenderer.invoke('game:library'),
  inspectGame: () => ipcRenderer.invoke('game:inspect'),
  extractGame: (names?: string[]) => ipcRenderer.invoke('game:extract', names),
  readGameResource: (key: string) => ipcRenderer.invoke('game:resource', key),
  cancelGameExtraction: () => ipcRenderer.invoke('game:cancel'),
  onGameProgress: (fn: (value: unknown) => void) => listen('game:progress', fn),
  clearData: () => ipcRenderer.invoke('data:clear'),
  onOcr: (fn: (value: unknown) => void) => listen('ocr:result', fn),
  onBusy: (fn: (value: unknown) => void) => listen('ocr:busy', fn),
  onError: (fn: (value: unknown) => void) => listen('operation:error', fn),
  onState: (fn: (value: unknown) => void) => listen('state:changed', fn),
});
