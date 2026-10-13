import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  desktopCapturer,
  screen,
  dialog,
  shell,
  nativeImage,
  session,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  StateSchema,
  SettingsSchema,
  AssetSchema,
  freshState,
  type AppState,
} from '../src/domain/models';
import { maxrollReference } from '../src/services/importers';
import { persistState, readState } from './persistence';
import { recognize, stopOcr } from './ocr';
import { createGameAssets } from './gameAssets';

app.setName('Sanctum');
// Software rendering avoids transparent/blank native surfaces observed on the validation PC.
// The UI is mostly static; OCR runs in its own WASM worker.
app.disableHardwareAcceleration();
const root = path.join(__dirname, '..');
const testData = process.env.SANCTUM_TEST_DATA;
app.setPath(
  'userData',
  testData
    ? path.resolve(testData)
    : path.join(process.env.LOCALAPPDATA ?? app.getPath('appData'), 'DiabloBuildCompanion'),
);
if (!app.requestSingleInstanceLock()) app.quit();
const dataDirectory = app.getPath('userData');
let main: BrowserWindow;
let overlay: BrowserWindow | undefined;
let state: AppState = freshState();
let busy = false;
let writeQueue: Promise<unknown> = Promise.resolve();
let overlayBounds: Electron.Rectangle | undefined;
const gameAssets = createGameAssets(
  dataDirectory,
  path.join(__dirname, 'extractor.cjs').replace('app.asar', 'app.asar.unpacked'),
  (message) => {
    if (main && !main.isDestroyed()) main.webContents.send('game:progress', message);
  },
);
const languagePath = app.isPackaged
  ? path.join(process.resourcesPath, 'ocr')
  : path.join(root, 'resources', 'ocr');
const loadWindow = (window: BrowserWindow, hash = '') =>
  window.loadFile(path.join(root, 'dist', 'index.html'), { hash });
const webPreferences = {
  preload: path.join(__dirname, 'preload.cjs'),
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
};
function secure(window: BrowserWindow) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
}
function broadcast(channel: string, payload: unknown) {
  for (const w of [main, overlay]) if (w && !w.isDestroyed()) w.webContents.send(channel, payload);
}
function report(message: string) {
  broadcast('operation:error', message);
}
function showOverlay() {
  if (!overlay || overlay.isDestroyed()) {
    const wa = screen.getPrimaryDisplay().workArea;
    const saved = overlayBounds;
    const visible =
      saved &&
      screen
        .getAllDisplays()
        .some(
          (d) =>
            saved.x < d.workArea.x + d.workArea.width &&
            saved.y < d.workArea.y + d.workArea.height &&
            saved.x + saved.width > d.workArea.x &&
            saved.y + saved.height > d.workArea.y,
        );
    overlay = new BrowserWindow({
      width: 420,
      height: state.settings.compact ? 215 : 400,
      ...(visible ? saved : { x: wa.x + wa.width - 445, y: wa.y + 40 }),
      minWidth: 340,
      minHeight: 190,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      show: false,
      title: 'Sanctum Overlay',
      webPreferences,
    });
    secure(overlay);
    overlay.setAlwaysOnTop(true, 'screen-saver');
    overlay.once('ready-to-show', () => {
      overlay?.showInactive();
      overlay?.setAlwaysOnTop(true, 'screen-saver');
    });
    overlay.on('move', () => {
      if (overlay && !overlay.isDestroyed()) {
        overlayBounds = overlay.getBounds();
        void fs
          .writeFile(
            path.join(dataDirectory, 'overlay-position.json'),
            JSON.stringify(overlayBounds),
          )
          .catch(() => {});
      }
    });
    overlay.on('close', () => {
      overlay = undefined;
    });
    void loadWindow(overlay, 'overlay');
  } else overlay.showInactive();
  overlay?.setOpacity(state.settings.overlayOpacity);
  overlay?.setIgnoreMouseEvents(state.settings.clickThrough, { forward: true });
  overlay?.setAlwaysOnTop(true, 'screen-saver');
}
function toggleOverlay() {
  if (overlay?.isVisible()) overlay.hide();
  else showOverlay();
}
function registerHotkeys(settings: AppState['settings']) {
  globalShortcut.unregisterAll();
  const errors: string[] = [];
  for (const [hotkey, callback] of [
    [
      settings.captureHotkey,
      () => {
        void scanCapture();
      },
    ],
    [settings.overlayHotkey, toggleOverlay],
  ] as const) {
    try {
      if (!globalShortcut.register(hotkey, callback))
        errors.push(`Shortcut ${hotkey} is already in use.`);
    } catch {
      errors.push(`Invalid shortcut: ${hotkey}`);
    }
  }
  return errors;
}
async function scanBuffer(buffer: Buffer) {
  if (buffer.length > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB.');
  const decoded = nativeImage.createFromBuffer(buffer);
  if (decoded.isEmpty()) throw new Error('Could not read this image. Use PNG, JPEG or WebP.');
  const size = decoded.getSize();
  if (size.width > 12000 || size.height > 12000)
    throw new Error('Image dimensions must be below 12000 pixels.');
  // High-contrast resizing improves small tooltip text; no screenshot is saved.
  const resized = decoded.resize({
    width: Math.min(2400, Math.max(size.width, 1000)),
    quality: 'best',
  });
  const result = await recognize(resized.toPNG(), languagePath);
  if (!result.text.trim())
    throw new Error('No text was recognized. Adjust the capture region or use a clearer image.');
  main.webContents.send('ocr:result', { ...result, image: decoded.toDataURL() });
  if (state.settings.overlayEnabled) showOverlay();
  return result;
}
async function withScan(operation: () => Promise<unknown>) {
  if (busy) throw new Error('A scan is already running.');
  busy = true;
  broadcast('ocr:busy', true);
  try {
    return await operation();
  } finally {
    busy = false;
    broadcast('ocr:busy', false);
  }
}
async function scanCapture() {
  try {
    await withScan(async () => {
      const displays = screen.getAllDisplays();
      const display = state.settings.displayId
        ? displays.find((d) => String(d.id) === state.settings.displayId)
        : screen.getPrimaryDisplay();
      if (!display)
        throw new Error('Your selected display is disconnected. Select a display in Settings.');
      const { region } = state.settings;
      if (
        region.x + region.width > display.bounds.width ||
        region.y + region.height > display.bounds.height
      )
        throw new Error(
          'Capture region extends beyond the selected display. Adjust it in Settings.',
        );
      const wasVisible = overlay?.isVisible();
      overlay?.hide();
      try {
        await new Promise((resolve) => setTimeout(resolve, 120));
        const maxW = Math.ceil(Math.max(...displays.map((d) => d.bounds.width * d.scaleFactor)));
        const maxH = Math.ceil(Math.max(...displays.map((d) => d.bounds.height * d.scaleFactor)));
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: maxW, height: maxH },
          fetchWindowIcons: false,
        });
        const source = sources.find((s) => s.display_id === String(display.id));
        if (!source || source.thumbnail.isEmpty())
          throw new Error(
            'Display capture is unavailable. Use screenshot upload or a standalone companion window.',
          );
        const size = source.thumbnail.getSize();
        const ratioX = size.width / display.bounds.width,
          ratioY = size.height / display.bounds.height;
        const cropped = source.thumbnail.crop({
          x: Math.round(region.x * ratioX),
          y: Math.round(region.y * ratioY),
          width: Math.round(region.width * ratioX),
          height: Math.round(region.height * ratioY),
        });
        await scanBuffer(cropped.toPNG());
      } finally {
        if (wasVisible) showOverlay();
      }
    });
  } catch (e) {
    report(e instanceof Error ? e.message : 'Capture failed.');
  }
}
app.whenReady().then(async () => {
  await fs.mkdir(dataDirectory, { recursive: true });
  const loaded = await readState(dataDirectory);
  state = loaded.state;
  try {
    const b = JSON.parse(
      await fs.readFile(path.join(dataDirectory, 'overlay-position.json'), 'utf8'),
    );
    overlayBounds = z
      .object({
        x: z.number().int(),
        y: z.number().int(),
        width: z.number().int().min(340).max(900),
        height: z.number().int().min(190).max(1200),
      })
      .parse(b);
  } catch {
    /* Fall back to current primary display. */
  }
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) =>
    callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  // Packaged operation is offline. Prevent renderer and OCR from contacting remote hosts.
  session.defaultSession.webRequest.onBeforeRequest((details, callback) =>
    callback({ cancel: /^https?:/i.test(details.url) }),
  );
  main = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 950,
    minHeight: 650,
    title: 'Sanctum â€” Diablo IV Companion',
    backgroundColor: '#101112',
    autoHideMenuBar: true,
    show: false,
    webPreferences,
    icon: path.join(root, 'resources', 'icon.ico'),
  });
  secure(main);
  main.once('ready-to-show', async () => {
    main.show();
    if (loaded.warning) report(loaded.warning);
    let errors = registerHotkeys(state.settings);
    if (errors.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      errors = registerHotkeys(state.settings);
    }
    for (const error of errors) report(error);
  });
  void loadWindow(main);
  const handle = (name: string, fn: (...args: unknown[]) => unknown) =>
    ipcMain.handle(name, (event, ...args) => {
      if (![main, overlay].some((w) => w && !w.isDestroyed() && w.webContents === event.sender))
        throw new Error('Unauthorized IPC sender.');
      return fn(...args);
    });
  handle('state:load', () => state);
  handle('state:save', (input) => {
    const next = StateSchema.parse(input);
    writeQueue = writeQueue
      .catch(() => {})
      .then(async () => {
        await persistState(dataDirectory, next);
        state = next;
        if (overlay && !overlay.isDestroyed()) overlay.webContents.send('state:changed', state);
      });
    return writeQueue;
  });
  handle('settings:apply', (input) => {
    const settings = SettingsSchema.parse(input);
    const errors = registerHotkeys(settings);
    if (errors.length) {
      registerHotkeys(state.settings);
      return errors;
    }
    if (overlay) {
      overlay.setOpacity(settings.overlayOpacity);
      overlay.setIgnoreMouseEvents(settings.clickThrough, { forward: true });
      overlay.setSize(420, settings.compact ? 215 : 400);
    }
    return errors;
  });
  handle('displays:list', () =>
    screen.getAllDisplays().map((d) => ({
      id: String(d.id),
      name: d.label || `Display ${d.id}`,
      width: d.bounds.width,
      height: d.bounds.height,
      scale: d.scaleFactor,
    })),
  );
  handle('capture:scan', async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await scanCapture();
  });
  handle('image:scan', async (input) =>
    withScan(async () => {
      if (
        typeof input !== 'string' ||
        input.length > 28 * 1024 * 1024 ||
        !/^data:image\/(png|jpeg|webp);base64,/.test(input)
      )
        throw new Error('Use a PNG, JPEG or WebP image under 20 MB.');
      return scanBuffer(Buffer.from(input.split(',')[1], 'base64'));
    }),
  );
  handle('overlay:toggle', toggleOverlay);
  handle('overlay:resize', (input) => {
    const height = z.number().int().min(190).max(650).parse(input);
    if (overlay) {
      overlay.setSize(overlay.getSize()[0], height);
      overlay.setAlwaysOnTop(true, 'screen-saver');
    }
  });
  handle('overlay:main', () => {
    main.show();
    main.focus();
  });
  handle('link:open', (url) => shell.openExternal(maxrollReference(z.string().parse(url))));
  handle('asset:import', async (input) => {
    const meta = AssetSchema.omit({ checksum: true, filename: true }).parse(input);
    const selected = await dialog.showOpenDialog(main, {
      title: 'Import an image you have permission to use',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (selected.canceled) return null;
    const buffer = await fs.readFile(selected.filePaths[0]);
    if (buffer.length > 5 * 1024 * 1024) throw new Error('Asset must be smaller than 5 MB.');
    const img = nativeImage.createFromBuffer(buffer),
      size = img.getSize();
    if (img.isEmpty() || size.width > 4096 || size.height > 4096)
      throw new Error('Use an image up to 4096 Ã— 4096 pixels.');
    const normalized = img.toPNG();
    const checksum = createHash('sha256').update(normalized).digest('hex');
    const filename = `${checksum}.png`;
    const directory = path.join(dataDirectory, 'assets');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), normalized);
    return { ...meta, checksum, filename };
  });
  handle('asset:read', async (input) => {
    await writeQueue.catch(() => {});
    const id = z.string().parse(input);
    const asset = state.assets.find((a) => a.id === id);
    if (!asset) return null;
    if (asset.gameBuild && asset.gameBuild !== (await gameAssets.load())?.build) return null;
    if (!/^[a-f0-9]{64}\.png$/.test(asset.filename)) return null;
    try {
      const filename = path.join(dataDirectory, 'assets', asset.filename);
      if ((await fs.stat(filename)).size > 12 * 1024 * 1024) return null;
      const buffer = await fs.readFile(filename);
      if (createHash('sha256').update(buffer).digest('hex') !== asset.checksum) return null;
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  });
  handle('game:library', () => gameAssets.load());
  handle('game:inspect', async () => {
    const selected = await dialog.showOpenDialog(main, {
      title: 'Select your installed Steam Diablo IV folder',
      properties: ['openDirectory'],
    });
    if (selected.canceled) return null;
    return gameAssets.inspect(selected.filePaths[0]);
  });
  handle('game:extract', (input) =>
    gameAssets.extract(z.array(z.string().min(1).max(200)).max(150).optional().parse(input)),
  );
  handle('game:resource', (input) =>
    gameAssets.read(
      z
        .string()
        .regex(/^\d+(\.\d+)?$/)
        .parse(input),
    ),
  );
  handle('game:cancel', () => gameAssets.cancel());
  handle('data:clear', async () => {
    if (gameAssets.busy)
      throw new Error('Cancel game asset extraction before clearing local data.');
    await writeQueue.catch(() => {});
    const directory = path.resolve(dataDirectory);
    if (directory === path.parse(directory).root) throw new Error('Invalid data directory.');
    await fs.rm(path.join(directory, 'assets'), { recursive: true, force: true });
    await fs.rm(path.join(directory, 'overlay-position.json'), { force: true });
    await fs.rm(path.join(directory, 'game-library.json'), { force: true });
    await fs.rm(path.join(directory, 'game-asset-selection.json'), { force: true });
    state = freshState();
    await persistState(directory, state);
    registerHotkeys(state.settings);
    broadcast('state:changed', state);
    return state;
  });
});
app.on('will-quit', () => {
  gameAssets.cancel();
  globalShortcut.unregisterAll();
  void stopOcr();
});
app.on('window-all-closed', () => app.quit());
