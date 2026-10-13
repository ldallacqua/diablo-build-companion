import { cropRgba, type TextureInfo } from './textures';

// The game stores this frame as eight independent pieces. This recipe contains
// handles and placement only; all pixels come from the user's installed atlas.
const tooltipPieces = [
  [3617083868, 0, 0, 28, 28],
  [1477447807, 28, 0, 115, 28],
  [2976791087, 143, 0, 28, 28],
  [1686618293, 0, 28, 28, 115],
  [2511313384, 143, 28, 28, 115],
  [3281059262, 0, 143, 28, 28],
  [4146734621, 28, 143, 115, 28],
  [477913681, 143, 143, 28, 28],
] as const;

export function composeTooltipFrame(info: TextureInfo, rgba: Buffer): Buffer | null {
  if (info.name !== '2DUITiled_TooltipFrame') return null;
  const frames = tooltipPieces.map(([handle, , , width, height]) =>
    info.frames.find((f) => f.handle === handle && f.width === width && f.height === height),
  );
  if (frames.some((f) => !f)) return null;
  const output = Buffer.alloc(171 * 171 * 4);
  tooltipPieces.forEach(([, x, y, width, height], index) => {
    const pixels = cropRgba(rgba, info.width, frames[index]!);
    for (let row = 0; row < height; row++)
      pixels.copy(output, ((y + row) * 171 + x) * 4, row * width * 4, (row + 1) * width * 4);
  });
  return output;
}
