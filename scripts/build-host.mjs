import { build } from 'esbuild';
import path from 'node:path';
await build({
  absWorkingDir: process.cwd(),
  entryPoints: ['desktop/main.ts', 'desktop/preload.ts', 'desktop/extractor.ts'].map((p) =>
    path.resolve(p),
  ),
  outdir: 'dist-host',
  outExtension: { '.js': '.cjs' },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  sourcemap: true,
});
