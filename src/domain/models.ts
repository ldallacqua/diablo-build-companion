import { z } from 'zod';

export const SlotSchema = z.enum([
  'helm',
  'chest',
  'gloves',
  'pants',
  'boots',
  'amulet',
  'ring',
  'weapon',
  'offhand',
  'charm',
  'seal',
  'unknown',
]);
export type Slot = z.infer<typeof SlotSchema>;
export const AffixRuleSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(160),
  aliases: z.array(z.string().min(1).max(160)).default([]),
  priority: z.enum(['primary', 'secondary']).default('primary'),
  slots: z.array(SlotSchema).default([]),
  minimum: z.number().optional(),
  unit: z.enum(['percent', 'flat', 'ranks']).optional(),
  direction: z.enum(['higher', 'lower']).default('higher'),
});
export const BuildSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(120),
    class: z.string().min(1).max(60),
    stage: z.enum(['leveling', 'endgame']),
    sourceUrl: z.string().url().optional(),
    attribution: z.string().max(300).default('User-provided build'),
    season: z.string().max(80).default('Unspecified'),
    patch: z.string().max(40).default('Unverified'),
    updatedAt: z.string().datetime(),
    coverage: z.enum(['partial', 'complete']).default('partial'),
    skills: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          rank: z.number().int().min(1).max(100),
          upgrade: z.string().optional(),
          reason: z.string().default('Next step in your supplied build'),
        }),
      )
      .max(300)
      .default([]),
    equipment: z.array(z.object({ slot: SlotSchema, note: z.string() })).default([]),
    affixes: z.array(AffixRuleSchema).max(150).default([]),
    aspects: z.array(z.string().min(1)).default([]),
    uniques: z.array(z.string().min(1)).default([]),
    tempering: z.array(z.string()).default([]),
    masterworking: z.array(z.string()).default([]),
    paragon: z
      .array(
        z.object({
          id: z.string().min(1),
          board: z.string().min(1),
          glyph: z.string().optional(),
          objective: z.string().min(1),
        }),
      )
      .max(300)
      .default([]),
    prerequisites: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          kind: z.enum(['level', 'skillCount', 'paragonCount', 'unique', 'aspect', 'manual']),
          value: z.number().nonnegative().optional(),
          target: z.string().optional(),
          required: z.boolean().default(true),
        }),
      )
      .default([]),
  })
  .superRefine((b, ctx) => {
    for (const key of ['skills', 'affixes', 'paragon', 'prerequisites'] as const) {
      const ids = b[key].map((x) => x.id);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'IDs must be unique within each collection',
        });
    }
    b.prerequisites.forEach((p, i) => {
      if (['level', 'skillCount', 'paragonCount'].includes(p.kind) && p.value === undefined)
        ctx.addIssue({
          code: 'custom',
          path: ['prerequisites', i, 'value'],
          message: 'A numeric threshold is required',
        });
      if (['unique', 'aspect'].includes(p.kind) && !p.target)
        ctx.addIssue({
          code: 'custom',
          path: ['prerequisites', i, 'target'],
          message: 'A target name is required',
        });
    });
  });
export type Build = z.infer<typeof BuildSchema>;
export type AffixRule = z.infer<typeof AffixRuleSchema>;
export const ItemSchema = z.object({
  name: z.string(),
  rarity: z.enum(['common', 'magic', 'rare', 'legendary', 'unique', 'mythic', 'unknown']),
  slot: SlotSchema,
  power: z.number().optional(),
  affixes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      value: z.number().optional(),
      unit: z.enum(['percent', 'flat', 'ranks']),
      greater: z.boolean(),
      raw: z.string(),
    }),
  ),
  aspects: z.array(z.string()),
  unknownLines: z.array(z.string()),
  tempering: z.array(z.string()),
  masterworking: z.string().optional(),
  confidence: z.number().min(0).max(100),
  confirmed: z.boolean(),
  raw: z.string(),
});
export type Item = z.infer<typeof ItemSchema>;
export const SettingsSchema = z.object({
  captureHotkey: z.string().default('CommandOrControl+Shift+D'),
  overlayHotkey: z.string().default('CommandOrControl+Alt+Shift+O'),
  overlayEnabled: z.boolean().default(true),
  overlayOpacity: z.number().min(0.35).max(1).default(0.96),
  clickThrough: z.boolean().default(false),
  compact: z.boolean().default(false),
  displayId: z.string().default(''),
  region: z
    .object({
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative(),
      width: z.number().int().min(40).max(12000),
      height: z.number().int().min(40).max(12000),
    })
    .default({ x: 0, y: 0, width: 600, height: 850 }),
  language: z.enum(['en', 'pt-BR']).default('en'),
  gameTheme: z.boolean().default(false),
});
export type Settings = z.infer<typeof SettingsSchema>;
export const AssetSchema = z.object({
  id: z.string().regex(/^(skill|item|class|paragon|texture)\.[a-z0-9.-]{1,100}$/),
  category: z.string(),
  source: z.string().min(1).max(300),
  license: z.string().min(1).max(200),
  checksum: z.string(),
  filename: z.string(),
  compatiblePatch: z.string().default('*'),
  gameBuild: z.string().max(100).optional(),
  resourceKey: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional(),
  slice: z.array(z.number().int().nonnegative().max(32768)).length(4).optional(),
});
export type Asset = z.infer<typeof AssetSchema>;
export const StateSchema = z.object({
  schemaVersion: z.literal(2),
  onboarded: z.boolean(),
  builds: z.object({ leveling: BuildSchema.nullable(), endgame: BuildSchema.nullable() }),
  active: z.enum(['leveling', 'endgame']),
  transition: z.enum(['leveling', 'postponed', 'endgame']),
  character: z.object({
    name: z.string().max(80),
    level: z.number().int().min(1).max(1000),
    paragon: z.number().int().nonnegative().max(10000),
  }),
  skillProgress: z.record(z.string(), z.array(z.string())),
  paragonProgress: z.record(z.string(), z.array(z.string())),
  ownedUniques: z.array(z.string()),
  ownedAspects: z.array(z.string()),
  manualRequirements: z.array(z.string()),
  settings: SettingsSchema,
  lastItem: ItemSchema.nullable(),
  equipped: z.record(z.string(), ItemSchema),
  assets: z.array(AssetSchema),
});
export type AppState = z.infer<typeof StateSchema>;
export const freshState = (): AppState =>
  StateSchema.parse({
    schemaVersion: 2,
    onboarded: false,
    builds: { leveling: null, endgame: null },
    active: 'leveling',
    transition: 'leveling',
    character: { name: 'Wanderer', level: 1, paragon: 0 },
    skillProgress: {},
    paragonProgress: {},
    ownedUniques: [],
    ownedAspects: [],
    manualRequirements: [],
    settings: {},
    lastItem: null,
    equipped: {},
    assets: [],
  });
