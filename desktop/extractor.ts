import fs from 'node:fs';
import path from 'node:path';
import { extractGame, inspectGame } from './extraction/library';
export * from './extraction/library';
const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(name);
  return at < 0 ? undefined : args[at + 1];
};
if (args.includes('--inspect') || args.includes('--extract')) {
  try {
    const installation = flag('--installation');
    if (!installation)
      throw new Error('Supply --installation with your installed Diablo IV directory.');
    const progress = (message: string) => {
      process.stderr.write(JSON.stringify({ message }) + '\n');
    };
    if (args.includes('--inspect')) {
      const { archive, textures } = inspectGame(installation, progress);
      process.stdout.write(
        JSON.stringify({
          build: archive.version,
          textures: textures
            .filter((texture) => /^2DUI/i.test(texture.name))
            .map(({ id, name, width, height, format, frames }) => ({
              id,
              name,
              width,
              height,
              format,
              frames: frames.length,
            })),
        }),
      );
    } else {
      const output = flag('--output');
      if (!output)
        throw new Error('Supply a private --output directory outside the repository/game.');
      const namesFile = flag('--selection');
      const names = namesFile
        ? JSON.parse(fs.readFileSync(path.resolve(namesFile), 'utf8'))
        : undefined;
      if (
        names !== undefined &&
        (!Array.isArray(names) || names.some((s) => typeof s !== 'string' || s.length > 200))
      )
        throw new Error('Invalid texture selection.');
      const result = extractGame(installation, output, names, progress);
      process.stdout.write(JSON.stringify(result));
    }
  } catch (error) {
    process.stderr.write(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Extraction failed' }) +
        '\n',
    );
    process.exitCode = 1;
  }
}
