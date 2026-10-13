import { _electron, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
export async function launch(directory?: string) {
  const data = directory ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'sanctum-e2e-')));
  const app = await _electron.launch({
    args: process.env.SANCTUM_PACKAGED_EXE ? [] : ['.'],
    executablePath: process.env.SANCTUM_PACKAGED_EXE,
    cwd: process.cwd(),
    env: { ...process.env, SANCTUM_TEST_DATA: data },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page, data };
}
export async function close(app: ElectronApplication) {
  await app.close();
}
