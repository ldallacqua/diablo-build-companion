import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { launch, close } from './helpers';
import { freshState } from '../../src/domain/models';
import { withExamples } from '../../src/data/examples';
import { encodePng } from '../../desktop/extraction/textures';

test('private theme has distinct states, resets hover, crops glyph padding and preserves utility icons', async () => {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'sanctum-theme-'));
  await fs.mkdir(path.join(data, 'assets'));
  const state = withExamples(freshState());
  state.settings.gameTheme = true;
  const roles = [
    'panel.frame',
    'button',
    'button.hover',
    'button.pressed',
    'button.primary',
    'button.primary.hover',
    'button.primary.pressed',
    'button.disabled',
    'icon.overview',
  ];
  for (const [index, role] of roles.entries()) {
    // Original colored pixels with an intentionally off-centre glyph. Never game bytes.
    const rgba = Buffer.alloc(64 * 64 * 4);
    for (let y = 4; y < 16; y++)
      for (let x = 28; x < 38; x++) {
        const offset = (y * 64 + x) * 4;
        rgba[offset] = 80 + index * 16;
        rgba[offset + 1] = 110;
        rgba[offset + 2] = 140;
        rgba[offset + 3] = 255;
      }
    const png = encodePng(rgba, 64, 64);
    const checksum = createHash('sha256').update(png).digest('hex');
    await fs.writeFile(path.join(data, 'assets', checksum + '.png'), png);
    state.assets.push({
      id: 'texture.' + role,
      category: 'texture',
      source: 'Original test pixels',
      license: 'MIT',
      filename: checksum + '.png',
      checksum,
      compatiblePatch: '*',
    });
  }
  await fs.writeFile(path.join(data, 'state.json'), JSON.stringify(state));
  const run = await launch(data);
  try {
    const { page } = run;
    await page.setViewportSize({ width: 1387, height: 1000 });
    await expect(page.locator('html')).toHaveClass(/has-game-assets/);
    await expect(page.locator('nav [data-game-icon="overview"]')).toHaveAttribute(
      'viewBox',
      '28 4 10 12',
    );
    const primary = page.getByRole('button', { name: 'Evaluate an item', exact: true });
    const paint = () =>
      primary.evaluate((el) => getComputedStyle(el, '::before').borderImageSource);
    await page.mouse.move(1100, 50);
    const normal = await paint();
    expect(normal).not.toBe('none');
    await primary.hover();
    await expect.poll(paint).not.toBe(normal);
    const hover = await paint();
    await page.mouse.down();
    await expect.poll(paint).not.toBe(hover);
    await page.mouse.move(1100, 50);
    await page.mouse.up();
    await expect.poll(paint).toBe(normal);
    await expect(primary.locator('svg').first()).not.toHaveCSS('stroke', 'rgba(0, 0, 0, 0)');
    await primary.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(primary).toBeFocused();
    await expect(primary).toHaveCSS('outline-style', 'solid');
    await expect(primary).toHaveCSS('outline-width', '2px');
    const settings = page.getByRole('button', { name: 'Settings', exact: true });
    const background = () => settings.evaluate((el) => getComputedStyle(el).backgroundColor);
    const idle = await background();
    await settings.hover();
    await expect.poll(background).not.toBe(idle);
    await page.mouse.move(1100, 50);
    await expect.poll(background).toBe(idle);
    await expect(page.locator('nav button[aria-current="page"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Item advisor', exact: true }).click();
    const disabled = page.getByRole('button', { name: 'Confirm corrected text', exact: true });
    await expect(disabled).toBeDisabled();
    const disabledPaint = await disabled.evaluate(
      (el) => getComputedStyle(el, '::before').borderImageSource,
    );
    await disabled.hover();
    await page.mouse.down();
    await expect(disabled).toHaveCSS('transform', 'none');
    expect(
      await disabled.evaluate((el) => getComputedStyle(el, '::before').borderImageSource),
    ).toBe(disabledPaint);
    await page.mouse.up();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(disabled).toHaveCSS('transition-duration', '0s');
  } finally {
    await close(run.app);
    await fs.rm(data, { recursive: true, force: true });
  }
});
