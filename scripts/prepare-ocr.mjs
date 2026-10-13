import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const destination = path.resolve('resources/ocr/eng.traineddata.gz');
await fs.mkdir(path.dirname(destination), { recursive: true });
try {
  await fs.access(destination);
} catch {
  const response = await fetch(
    'https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0_best_int/eng.traineddata.gz',
  );
  if (!response.ok) throw new Error(`OCR model download failed: ${response.status}`);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
}
const checksum = createHash('sha256')
  .update(await fs.readFile(destination))
  .digest('hex');
const lockPath = 'resources/ocr/model-lock.json';
try {
  const lock = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  if (lock.sha256 !== checksum)
    throw new Error('OCR model checksum mismatch. Verify provenance before updating the lock.');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
  await fs.writeFile(
    lockPath,
    JSON.stringify(
      {
        source: 'https://github.com/naptha/tessdata',
        model: '4.0.0_best_int/eng',
        license: 'Apache-2.0',
        sha256: checksum,
      },
      null,
      2,
    ) + '\n',
  );
}
console.log('Local English OCR model verified:', checksum);
