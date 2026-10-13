import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const files = [];
async function walk(directory) {
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) await walk(file);
    else if (/\.(png|ico|svg|webp|woff2)$/i.test(file)) {
      const generated = file.replaceAll('\\', '/').startsWith('public/hero');
      const inter = file.endsWith('InterVariable.woff2');
      files.push({
        path: file.replaceAll('\\', '/'),
        source: inter
          ? 'https://github.com/rsms/inter/blob/353b61b9f4430d5f420d56605a6e7993e0941470/docs/font-files/InterVariable.woff2'
          : generated
            ? 'Original AI-assisted gothic matte painting, built-in imagegen, 2026-10-13'
            : file.includes('visual')
              ? 'Original Sanctum application screenshot baseline'
              : 'Original programmatic Sanctum artwork/tooltip fixture',
        license: inter
          ? 'SIL Open Font License 1.1 (public/fonts/OFL-Inter.txt)'
          : generated
            ? 'Project generated-art grant (see docs/ASSETS.md)'
            : 'MIT',
        sha256: createHash('sha256')
          .update(await fs.readFile(file))
          .digest('hex'),
      });
    }
  }
}
for (const directory of ['public', 'resources', 'tests/fixtures', 'tests/visual'])
  await walk(directory);
await fs.writeFile(
  'resources/asset-licenses.json',
  JSON.stringify({ version: 1, files }, null, 2) + '\n',
);
console.log('Asset manifest updated. Review sources and grants before committing.');
