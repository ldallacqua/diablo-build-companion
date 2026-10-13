import { z } from 'zod';
export const GameResourceSchema = z.object({
  key: z.string().regex(/^\d+(\.\d+)?$/),
  name: z.string().min(1).max(300),
  sno: z.number().int().nonnegative(),
  handle: z.number().int().nonnegative().optional(),
  derived: z.boolean().optional(),
  width: z.number().int().min(1).max(32768),
  height: z.number().int().min(1).max(32768),
  filename: z.string().regex(/^[a-f0-9]{64}\.png$/),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  slice: z.array(z.number().int().nonnegative().max(32768)).length(4).optional(),
});
export const GameLibrarySchema = z.object({
  schemaVersion: z.literal(1),
  build: z.string().min(1).max(100),
  extractedAt: z.string().datetime(),
  resources: z.array(GameResourceSchema).max(30000),
  skipped: z.array(z.object({ name: z.string().max(300), reason: z.string().max(500) })).max(300),
});
export type GameResource = z.infer<typeof GameResourceSchema>;
export type GameLibrary = z.infer<typeof GameLibrarySchema>;
export interface GameInspection {
  build: string;
  textures: {
    id: number;
    name: string;
    width: number;
    height: number;
    format: number;
    frames: number;
  }[];
}
