import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:net';

// The NSIS portable wrapper does not forward Node inspector output to Playwright's
// Electron launcher. Test its actual child renderer through a loopback CDP port.
const executable = path.resolve('release/Sanctum-0.1.0-x64-Portable.exe');
await fs.access(executable);
const results = path.resolve('test-results');
await fs.mkdir(results, { recursive: true });
const data = await fs.mkdtemp(path.join(results, 'portable-'));
if (!data.startsWith(results + path.sep)) throw new Error('Unexpected test data path.');
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
let child;
let browser;

async function start() {
  child = spawn(executable, [`--remote-debugging-port=${port}`], {
    env: { ...process.env, SANCTUM_TEST_DATA: data },
    windowsHide: true,
    stdio: 'ignore',
  });
  const endpoint = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 45000;
  while (true) {
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) break;
    } catch {
      // Wait for the portable launcher to extract and start Electron.
    }
    if (Date.now() > deadline) throw new Error('Portable renderer did not start within 45 s.');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0];
  await expect.poll(() => context.pages().length).toBe(1);
  return context.pages()[0];
}

async function stop(page) {
  await page.close();
  await browser.close();
  const deadline = Date.now() + 15000;
  while (child.exitCode === null) {
    if (Date.now() > deadline) throw new Error('Portable wrapper did not exit cleanly.');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (child.exitCode !== 0) throw new Error(`Portable wrapper exit: ${child.exitCode}`);
}

try {
  const page = await start();
  await page.getByRole('button', { name: 'Explore with example builds' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Show scan results in overlay').uncheck();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Settings saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Item advisor', exact: true }).click();
  await page.getByLabel('Item screenshot').setInputFiles('tests/fixtures/tooltip.png');
  await expect(page.getByText('STASH FOR ENDGAME', { exact: true })).toBeVisible({
    timeout: 45000,
  });
  await expect(page.getByRole('heading', { name: 'RING OF THE TEMPEST' })).toBeVisible();
  await expect
    .poll(
      async () =>
        JSON.parse(await fs.readFile(path.join(data, 'state.json'), 'utf8')).lastItem?.name,
    )
    .toBe('RING OF THE TEMPEST');
  await stop(page);
  const restored = await start();
  await expect(restored.getByRole('heading', { name: 'Welcome back, Wanderer.' })).toBeVisible();
  await restored.getByRole('button', { name: 'Item advisor', exact: true }).click();
  await expect(restored.getByText('STASH FOR ENDGAME', { exact: true })).toBeVisible();
  await stop(restored);
  console.log(
    'Portable wrapper PASS: extraction, startup, local OCR, verdict, clean exit and persisted restart.',
  );
} finally {
  await browser?.close().catch(() => {});
  if (child?.exitCode === null) child.kill();
  // Test data contains only the original fixture and isolated example state.
  await fs.rm(data, { recursive: true, force: true });
}
