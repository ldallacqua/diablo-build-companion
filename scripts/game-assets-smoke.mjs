import { _electron, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const data = process.env.SANCTUM_PRIVATE_CACHE;
const previews = process.env.SANCTUM_PRIVATE_PREVIEWS;
if (!data || !previews)
  throw new Error(
    'Set SANCTUM_PRIVATE_CACHE and SANCTUM_PRIVATE_PREVIEWS outside this repository.',
  );
const repository = process.cwd();
for (const directory of [data, previews]) {
  const resolved = path.resolve(directory),
    relative = path.relative(repository, resolved);
  if (!relative.startsWith('..' + path.sep) || resolved === path.parse(resolved).root)
    throw new Error('Private QA files must be outside the repository.');
}
await fs.mkdir(previews, { recursive: true });
async function snapshot(page, name) {
  await page.mouse.move(1000, 40);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('nav button:hover')).toHaveCount(0);
  await page.waitForTimeout(180);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const root = document.documentElement;
    root.style.visibility = 'hidden';
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    root.style.visibility = '';
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: path.join(previews, name) });
}
const app = await _electron.launch({
  executablePath: process.env.SANCTUM_PACKAGED_EXE,
  args: [
    '--force-device-scale-factor=1',
    '--force-color-profile=srgb',
    ...(process.env.SANCTUM_PACKAGED_EXE ? [] : ['.']),
  ],
  cwd: repository,
  env: { ...process.env, SANCTUM_TEST_DATA: path.resolve(data) },
});
try {
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1387, height: 1000 });
  const onboarding = page.getByRole('button', { name: 'Explore with example builds' });
  if (await onboarding.isVisible()) await onboarding.click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  if (process.env.SANCTUM_GAME_INSTALLATION) {
    await app.evaluate(({ dialog }, installation) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [installation] });
    }, process.env.SANCTUM_GAME_INSTALLATION);
    await page.getByRole('button', { name: 'Choose game folder', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Extract core UI pack', exact: true }),
    ).toBeEnabled({ timeout: 60000 });
    await page.getByRole('button', { name: 'Extract core UI pack', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Use Diablo IV theme', exact: true }),
    ).toBeEnabled({ timeout: 180000 });
  }
  await expect(
    page.getByRole('button', { name: 'Use Diablo IV theme', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Use Diablo IV theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/has-game-assets/);
  await expect(page.locator('nav [data-game-icon]')).toHaveCount(6);
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.mouse.move(1000, 50);
  await snapshot(page, 'diablo-overview.png');
  const evaluateButton = page.getByRole('button', { name: 'Evaluate an item', exact: true });
  const buttonArt = () =>
    evaluateButton.evaluate((el) => getComputedStyle(el, '::before').borderImageSource);
  const normal = await buttonArt();
  await evaluateButton.screenshot({ path: path.join(previews, 'button-normal.png') });
  await evaluateButton.hover();
  await expect.poll(buttonArt).not.toBe(normal);
  const hovered = await buttonArt();
  await evaluateButton.screenshot({ path: path.join(previews, 'button-hover.png') });
  await page.mouse.down();
  await expect.poll(buttonArt).not.toBe(hovered);
  await evaluateButton.screenshot({ path: path.join(previews, 'button-pressed.png') });
  await page.mouse.move(1000, 40);
  await page.mouse.up();
  await expect.poll(buttonArt).toBe(normal);
  await evaluateButton.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(evaluateButton).toBeFocused();
  await expect(evaluateButton).toHaveCSS('outline-style', 'solid');
  await evaluateButton.screenshot({ path: path.join(previews, 'button-focus.png') });
  await page.getByRole('button', { name: 'Item advisor', exact: true }).click();
  await page.getByRole('button', { name: 'Load synthetic example' }).click();
  await page.getByRole('button', { name: 'Confirm corrected text' }).click();
  await snapshot(page, 'diablo-advisor.png');
  await page.getByRole('button', { name: 'Skills', exact: true }).click();
  await expect(page.locator('[data-asset-id="skill.sorcerer.spark"] img').first()).toBeVisible();
  await expect(
    page.locator('[data-asset-id="skill.sorcerer.chainlightning"] img').first(),
  ).toBeVisible();
  await snapshot(page, 'diablo-skills.png');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const disabled = page.getByRole('button', { name: 'Previous', exact: true });
  await expect(disabled).toBeDisabled();
  await disabled.screenshot({ path: path.join(previews, 'button-disabled.png') });
  await snapshot(page, 'diablo-asset-library.png');
  await page.getByRole('button', { name: 'Open overlay', exact: true }).click();
  await expect.poll(() => app.windows().length).toBe(2);
  const overlay = app.windows().find((p) => p.url().endsWith('#overlay'));
  await expect(overlay.locator('html')).toHaveClass(/has-game-assets/);
  await snapshot(overlay, 'diablo-overlay.png');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  for (const [width, height, zoom] of [
    [1920, 1080, 1],
    [2560, 1440, 1],
    [3840, 2160, 2],
    [1050, 750, 1],
  ]) {
    await page.setViewportSize({ width, height });
    await app.evaluate(({ BrowserWindow }, zoom) => {
      BrowserWindow.getAllWindows()
        .find((w) => w.getTitle().startsWith('Sanctum —'))
        .webContents.setZoomFactor(zoom);
    }, zoom);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await snapshot(page, `diablo-overview-${width}.png`);
  }
  const library = await page.evaluate(() => window.sanctum.gameLibrary());
  console.log(
    JSON.stringify({
      realGameLibrary: true,
      build: library.build,
      images: library.resources.length,
      theme: true,
      overlayTheme: true,
      privatePreviews: path.resolve(previews),
    }),
  );
} finally {
  await app.close();
}
