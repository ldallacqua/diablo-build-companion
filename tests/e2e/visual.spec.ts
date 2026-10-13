import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import { launch, close } from './helpers';
async function snapshot(page: Page, name: string) {
  await page.evaluate(async () => {
    // Fully repaint static text as well as the changed route. Electron's software
    // capture can otherwise reuse incomplete glyph layers between screenshots.
    const root = document.documentElement;
    root.style.visibility = 'hidden';
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    root.style.visibility = '';
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await expect(page).toHaveScreenshot(name);
}
test('all principal screens and overlay match reviewed Windows baselines', async () => {
  const run = await launch();
  try {
    // Electron initially clamps windows to the physical desktop (CI uses 1024 × 768).
    // A fixed renderer viewport makes the reviewed pixels independent of that desktop.
    await run.page.setViewportSize({ width: 1387, height: 885 });
    await run.page.getByRole('button', { name: 'Explore with example builds' }).click();
    await run.page.waitForTimeout(650);
    await expect(run.page.getByRole('alert')).toHaveCount(0);
    await snapshot(run.page, 'dashboard.png');
    await run.page.getByRole('button', { name: 'Item advisor', exact: true }).click();
    await run.page.getByRole('button', { name: 'Load synthetic example' }).click();
    await run.page.getByRole('button', { name: 'Confirm corrected text' }).click();
    await run.page.evaluate(() => window.scrollTo(0, 0));
    await snapshot(run.page, 'advisor.png');
    for (const [label, name] of [
      ['Skills', 'skills'],
      ['Paragon', 'paragon'],
      ['Builds & transition', 'transition'],
      ['Settings', 'settings'],
    ] as const) {
      await run.page.getByRole('button', { name: label, exact: true }).click();
      await run.page.evaluate(() => window.scrollTo(0, 0));
      await snapshot(run.page, `${name}.png`);
    }
    await run.page.getByRole('button', { name: 'Open overlay', exact: true }).click();
    await expect.poll(() => run.app.windows().length).toBe(2);
    const overlay = run.app.windows().find((p) => p.url().endsWith('#overlay'))!;
    await expect(overlay).toHaveTitle('Sanctum Overlay');
    await snapshot(overlay, 'overlay.png');
  } finally {
    await close(run.app);
    await fs.rm(run.data, { recursive: true, force: true });
  }
});
test('desktop layouts remain contained at 1080p, 1440p, 4K and 200% scaling', async () => {
  const run = await launch();
  try {
    await run.page.getByRole('button', { name: 'Explore with example builds' }).click();
    for (const [width, height, zoom] of [
      [1920, 1080, 1],
      [2560, 1440, 1],
      [3840, 2160, 2],
      [1050, 750, 1],
    ]) {
      await run.app.evaluate(
        ({ BrowserWindow }, { width, height, zoom }) => {
          const w = BrowserWindow.getAllWindows().find((w) =>
            w.getTitle().startsWith('Sanctum —'),
          )!;
          w.setContentSize(width, height);
          w.webContents.setZoomFactor(zoom);
        },
        { width, height, zoom },
      );
      await expect
        .poll(() =>
          run.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        )
        .toBe(true);
      await expect(
        run.page.getByRole('heading', { name: 'Welcome back, Wanderer.' }),
      ).toBeVisible();
    }
  } finally {
    await close(run.app);
    await fs.rm(run.data, { recursive: true, force: true });
  }
});
