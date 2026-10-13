import { _electron } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const directory = path.resolve('test-results/hotkey-runtime');
if (!directory.startsWith(path.resolve('test-results') + path.sep))
  throw new Error('Unsafe test directory.');
await fs.rm(directory, { recursive: true, force: true });
await fs.mkdir(directory, { recursive: true });
const app = await _electron.launch({
  args: ['.', '--disable-gpu'],
  cwd: process.cwd(),
  env: { ...process.env, SANCTUM_TEST_DATA: directory },
});
try {
  const page = await app.firstWindow();
  const onboarding = page.getByRole('button', { name: 'Explore with example builds' });
  await onboarding.waitFor({ state: 'visible' });
  await onboarding.click();
  for (let i = 0; i < 40; i++) {
    if ((await page.evaluate(() => window.sanctum.load())).onboarded) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await page.evaluate(async () => {
    const host = window.sanctum;
    const state = await host.load();
    state.lastItem = null;
    state.settings.displayId = '';
    state.settings.region = { x: 40, y: 40, width: 720, height: 540 };
    await host.save(state);
    const errors = await host.applySettings(state.settings);
    if (errors.length) throw new Error(errors.join(' '));
  });
  await app.evaluate(async ({ BrowserWindow, screen }, filename) => {
    const d = screen.getPrimaryDisplay();
    const fixture = new BrowserWindow({
      title: 'Sanctum original capture fixture',
      x: d.bounds.x + 40,
      y: d.bounds.y + 40,
      width: 720,
      height: 540,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    await fixture.loadFile(filename);
    fixture.setAlwaysOnTop(true, 'screen-saver');
    fixture.show();
    fixture.moveTop();
    fixture.focus();
  }, path.resolve('tests/fixtures/capture.html'));
  console.log('WAITING FOR NATIVE Ctrl+Shift+D ON ORIGINAL FIXTURE');
  const start = performance.now();
  let captured = false;
  while (performance.now() - start < 60000) {
    const item = await page.evaluate(async () => (await window.sanctum.load()).lastItem);
    if (item?.name === 'RING OF THE TEMPEST') {
      captured = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!captured) throw new Error('No synthetic tooltip was recognized after the native shortcut.');
  const result = await page.evaluate(async () => {
    const s = await window.sanctum.load();
    return {
      name: s.lastItem.name,
      confidence: s.lastItem.confidence,
      affixes: s.lastItem.affixes.map((a) => a.id),
      globalShortcut: s.settings.captureHotkey,
    };
  });
  if (!result.affixes.includes('critical-strike-chance') || result.confidence < 75)
    throw new Error('Native recognition did not meet the expected quality threshold.');
  await page.getByRole('button', { name: 'Item advisor', exact: true }).click();
  await page.getByText('STASH FOR ENDGAME', { exact: true }).waitFor({ state: 'visible' });
  result.wallTimeIncludingManualTriggerMs = Math.round(performance.now() - start);
  await fs.writeFile('test-results/hotkey-smoke.json', JSON.stringify(result, null, 2));
  console.log('NATIVE HOTKEY CAPTURE PASSED', JSON.stringify(result));
} finally {
  await app.close();
}
