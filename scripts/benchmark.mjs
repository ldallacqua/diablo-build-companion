import { _electron } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const data = await fs.mkdtemp(path.join(os.tmpdir(), 'sanctum-benchmark-'));
const app = await _electron.launch({
  args: ['.'],
  cwd: process.cwd(),
  env: { ...process.env, SANCTUM_TEST_DATA: data },
});
try {
  const page = await app.firstWindow();
  await page.getByRole('button', { name: 'Explore with example builds' }).click();
  const fixture =
    'data:image/png;base64,' + (await fs.readFile('tests/fixtures/tooltip.png')).toString('base64');
  const samples = [];
  for (let i = 0; i < 6; i++) {
    const start = performance.now();
    const result = await page.evaluate((image) => window.sanctum.scanImage(image), fixture);
    samples.push({
      ocrMs: result.milliseconds,
      totalUploadPipelineMs: Math.round(performance.now() - start),
      confidence: result.confidence,
    });
  }
  const metrics = await app.evaluate(({ app }) => {
    const metrics = app.getAppMetrics();
    return {
      totalWorkingSetMb: Math.round(
        metrics.reduce((sum, m) => sum + m.memory.workingSetSize, 0) / 1024,
      ),
      totalPrivateMb: Math.round(
        metrics.reduce((sum, m) => sum + (m.memory.privateBytes ?? 0), 0) / 1024,
      ),
      processCount: metrics.length,
    };
  });
  await new Promise((resolve) => setTimeout(resolve, 16000));
  const idleMetrics = await app.evaluate(({ app }) => {
    const metrics = app.getAppMetrics();
    return {
      workingSetMb: Math.round(metrics.reduce((sum, m) => sum + m.memory.workingSetSize, 0) / 1024),
      privateMb: Math.round(
        metrics.reduce((sum, m) => sum + (m.memory.privateBytes ?? 0), 0) / 1024,
      ),
    };
  });
  const output = {
    date: '2026-10-13',
    os: 'Windows 11 x64',
    fixture: 'Original 720x540 tooltip PNG; no game running',
    samples,
    ...metrics,
    idleAfterWorkerRelease: idleMetrics,
  };
  await fs.writeFile('docs/BENCHMARK.json', JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output));
} finally {
  await app.close();
  await fs.rm(data, { recursive: true, force: true });
}
