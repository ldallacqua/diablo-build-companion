import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { launch, close } from './helpers';
import { createSyntheticGame } from '../fixtures/syntheticArchive';
test('extract local archives in the real worker, browse sprites and persist the optional theme', async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'sanctum-game-fixture-'));
  const game = await createSyntheticGame(fixture);
  const first = await launch();
  const { data } = first;
  try {
    await first.page.getByRole('button', { name: 'Explore with example builds' }).click();
    await first.page.getByRole('button', { name: 'Settings', exact: true }).click();
    await first.app.evaluate(({ dialog }, directory) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [directory] });
    }, game);
    await first.page.getByRole('button', { name: 'Choose game folder', exact: true }).click();
    await expect(first.page.getByText('Build synthetic-1', { exact: true })).toBeVisible();
    await first.page.getByRole('button', { name: 'Extract core UI pack', exact: true }).click();
    await expect(first.page.getByText('2 cached images · build synthetic-1')).toBeVisible({
      timeout: 45000,
    });
    await first.page.getByRole('button', { name: 'Use Diablo IV theme', exact: true }).click();
    await expect(first.page.locator('html')).toHaveClass(/has-game-assets/);
    await first.page
      .getByRole('button', { name: 'Select 2DUITiled_HellGothicInsetBorder / 0', exact: true })
      .click();
    await first.page.getByLabel('Game asset semantic ID').fill('class.sorcerer');
    await first.page.getByRole('button', { name: 'Assign selected image' }).click();
    await expect
      .poll(async () =>
        JSON.parse(await fs.readFile(path.join(data, 'state.json'), 'utf8')).assets.some(
          (a: { id: string }) => a.id === 'class.sorcerer',
        ),
      )
      .toBe(true);
  } finally {
    await close(first.app);
  }
  const second = await launch(data);
  try {
    await expect(second.page.locator('html')).toHaveClass(/has-game-assets/);
    await second.page.getByRole('button', { name: 'Settings', exact: true }).click();
    await second.page.getByLabel('Game artwork enabled').uncheck();
    await expect(second.page.locator('html')).not.toHaveClass(/has-game-assets/);
    await second.page.getByRole('button', { name: 'Open overlay', exact: true }).click();
    await expect.poll(() => second.app.windows().length).toBe(2);
  } finally {
    await close(second.app);
    await fs.rm(data, { recursive: true, force: true });
    await fs.rm(fixture, { recursive: true, force: true });
  }
});
