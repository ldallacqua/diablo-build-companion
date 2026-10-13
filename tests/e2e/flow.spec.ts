import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { launch, close } from './helpers';
test('onboarding → OCR → both builds → transition → restart persistence', async () => {
  const first = await launch();
  const { page, data } = first;
  try {
    await page.getByRole('button', { name: 'Explore with example builds' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back, Wanderer.' })).toBeVisible();
    await page.getByRole('button', { name: 'Item advisor', exact: true }).click();
    await page.getByLabel('Item screenshot').setInputFiles('tests/fixtures/tooltip.png');
    await expect(page.getByText('STASH FOR ENDGAME', { exact: true })).toBeVisible({
      timeout: 45000,
    });
    await expect(page.getByRole('heading', { name: 'RING OF THE TEMPEST' })).toBeVisible();
    await page.getByRole('button', { name: 'Skills', exact: true }).click();
    await page.getByRole('button', { name: 'Mark allocated' }).click();
    await page.getByRole('button', { name: 'Builds & transition', exact: true }).click();
    await page.getByLabel('Character level').fill('70');
    await page.getByRole('button', { name: /Obtain Stormweaver/ }).click();
    await page.getByRole('button', { name: /Review the full skill and Paragon plan/ }).click();
    await page.getByRole('button', { name: /Accept endgame transition/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Your endgame chapter is active' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Item advisor', exact: true }).click();
    await expect(page.getByText('KEEP', { exact: true })).toBeVisible();
    await expect
      .poll(async () => JSON.parse(await fs.readFile(path.join(data, 'state.json'), 'utf8')).active)
      .toBe('endgame');
  } finally {
    await close(first.app);
  }
  const second = await launch(data);
  try {
    await expect(second.page.getByRole('heading', { name: 'Stormbound' })).toBeVisible();
    await expect(second.page.getByRole('dialog')).toHaveCount(0);
    await second.page.getByRole('button', { name: 'Item advisor', exact: true }).click();
    await expect(second.page.getByText('KEEP', { exact: true })).toBeVisible();
  } finally {
    await close(second.app);
    await fs.rm(data, { recursive: true, force: true });
  }
});
test('native overlay is transparent, always on top and recovers from click-through', async () => {
  const run = await launch();
  try {
    await run.page.getByRole('button', { name: 'Explore with example builds' }).click();
    await run.page.getByRole('button', { name: 'Open overlay', exact: true }).click();
    await expect.poll(() => run.app.windows().length).toBe(2);
    const props = await run.app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows().find((w) => w.getTitle() === 'Sanctum Overlay')!;
      return { top: w.isAlwaysOnTop(), opacity: w.getOpacity(), visible: w.isVisible() };
    });
    await expect
      .poll(() =>
        run.app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()
            .find((w) => w.getTitle() === 'Sanctum Overlay')!
            .isAlwaysOnTop(),
        ),
      )
      .toBe(true);
    expect(props.visible).toBe(true);
    expect(props.opacity).toBeGreaterThan(0.9);
    const overlay = run.app.windows().find((p) => p.url().endsWith('#overlay'))!;
    await expect(overlay.locator('html')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await run.page.getByRole('button', { name: 'Settings', exact: true }).click();
    await run.page.getByLabel('Click through overlay').check();
    await run.page.getByRole('button', { name: 'Save settings', exact: true }).click();
    await run.page.getByRole('button', { name: 'Open overlay', exact: true }).click();
    const isVisible = await run.app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.getTitle() === 'Sanctum Overlay')!
        .isVisible(),
    );
    expect(isVisible).toBe(false);
  } finally {
    await close(run.app);
    await fs.rm(run.data, { recursive: true, force: true });
  }
});
test('private asset cache normalizes raster files and handles missing or corrupt data', async () => {
  const run = await launch();
  try {
    await run.page.getByRole('button', { name: 'Explore with example builds' }).click();
    await run.app.evaluate(({ dialog }, filename) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filename] });
    }, path.resolve('tests/fixtures/tooltip.png'));
    const asset = await run.page.evaluate(() =>
      window.sanctum!.importAsset({
        id: 'class.sorcerer',
        category: 'class',
        source: 'Original synthetic test',
        license: 'MIT',
        compatiblePatch: '*',
      }),
    );
    expect(asset?.checksum).toMatch(/^[a-f0-9]{64}$/);
    await run.page.evaluate(async (asset) => {
      const s = await window.sanctum!.load();
      s.assets = [asset!];
      await window.sanctum!.save(s);
    }, asset);
    expect(await run.page.evaluate(() => window.sanctum!.readAsset('class.sorcerer'))).toMatch(
      /^data:image\/png;base64,/,
    );
    await fs.writeFile(path.join(run.data, 'assets', asset!.filename), 'corrupt');
    expect(await run.page.evaluate(() => window.sanctum!.readAsset('class.sorcerer'))).toBeNull();
    await fs.rm(path.join(run.data, 'assets', asset!.filename));
    expect(await run.page.evaluate(() => window.sanctum!.readAsset('class.sorcerer'))).toBeNull();
    expect(await run.page.evaluate(() => window.sanctum!.readAsset('../../private'))).toBeNull();
  } finally {
    await close(run.app);
    await fs.rm(run.data, { recursive: true, force: true });
  }
});
