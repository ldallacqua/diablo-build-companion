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
  await expect(page.locator('html')).toHaveClass(/has-game-icons/);
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await snapshot(page, 'diablo-overview.png');
  await page.getByRole('button', { name: 'Item advisor', exact: true }).click();
  await page.getByRole('button', { name: 'Load synthetic example' }).click();
  await page.getByRole('button', { name: 'Confirm corrected text' }).click();
  await snapshot(page, 'diablo-advisor.png');
  await page.getByRole('button', { name: 'Skills', exact: true }).click();
  await snapshot(page, 'diablo-skills.png');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await snapshot(page, 'diablo-asset-library.png');
  await page.getByRole('button', { name: 'Open overlay', exact: true }).click();
  await expect.poll(() => app.windows().length).toBe(2);
  const overlay = app.windows().find((p) => p.url().endsWith('#overlay'));
  await expect(overlay.locator('html')).toHaveClass(/has-game-assets/);
  await snapshot(overlay, 'diablo-overlay.png');
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
