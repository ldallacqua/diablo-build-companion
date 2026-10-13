import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(await fs.readFile('resources/asset-licenses.json', 'utf8'));
const approved = new Map(manifest.files.map((file) => [file.path, file]));
let files;
try {
  files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean);
} catch {
  throw new Error('Run this check in the project Git repository.');
}
const errors = [];
for (const file of files) {
  if (
    /(?:^|\/)(?:private-assets|game-assets|extracted-assets|private-previews|screenshots)\/|(?:^|\/)game-(?:library|asset-selection[^/]*)\.json$|-(?:meta|payload|child)\.dat$|\.(?:casc|mpq|bnk|blp|tex|traineddata)$/i.test(
      file,
    )
  )
    errors.push(`Forbidden local/game resource: ${file}`);
  if (/\.(png|jpg|jpeg|webp|ico|svg|ttf|woff2?)$/i.test(file)) {
    const entry = approved.get(file);
    if (!entry?.license || !entry?.source) errors.push(`Missing asset licensing record: ${file}`);
    else {
      const sha = createHash('sha256')
        .update(await fs.readFile(file))
        .digest('hex');
      if (entry.sha256 !== sha) errors.push(`Asset checksum changed without review: ${file}`);
    }
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(
  `Asset provenance guard passed (${approved.size} approved files). This guard cannot itself establish copyright ownership.`,
);
