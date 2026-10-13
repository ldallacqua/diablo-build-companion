# Asset provenance and local enhancements

The public application contains only original Sanctum resources and licensed software. No game archives, Blizzard icons/textures, characters or Maxroll guide assets are present. The licensing/hash guard checks source files, including original synthetic test images and application-only visual baselines. It is a prevention tool, not proof of ownership.

## Original resources

- `public/hero.png`: generated with the built-in imagegen tool on 2026-10-13. An original gothic landscape, anonymous cloaked wanderer and bronze arch; no recognizable game characters/logos. The project permits use, modification and redistribution of this generated resource with the application under the MIT grant, to the extent rights exist in AI-generated material. It is not claimed to have exclusive copyright or to be a Blizzard asset.
- `resources/icon.png` / `.ico` and the code-native Logo: original geometric Sanctum mark, MIT.
- `tests/fixtures/tooltip*.png`, `public/fixture-tooltip.png`: programmatically drawn fictional tooltip text, MIT. Stormweaver, Ring of the Tempest and example priorities are synthetic fixtures, not Maxroll imports.
- `tests/visual/`: screenshots of this original application and its synthetic data. They contain no private desktop/game content.
- Lucide icon components: ISC; system fonts are referenced, not redistributed.
- Tesseract.js, core and trained language data: Apache-2.0. OCR model provenance/checksum is in resources/ocr/model-lock.json. Electron/Chromium licenses accompany the runtime; other dependency notices are retained.

Final hero prompt (built-in mode):

> Use case: stylized-concept. Original wide hero background for Sanctum, a premium gothic dark fantasy desktop build companion. Atmospheric matte painting of a lone anonymous cloaked wanderer beneath a vast weathered bronze circular arch, distant ruined spires and mist in an obsidian rocky landscape. Very wide cinematic 3:1 banner; focal scene and wanderer on right third, left half nearly black negative space for application copy. Subtle old-gold light at arch, restrained crimson embers, deep charcoal shadows. Polished painterly realism, no recognizable game characters, Blizzard imagery, logos, text or watermark.

## Private asset importer

Settings → Personal Asset Library: choose a semantic ID, provide source and license/permission, then choose a raster file. Examples: `class.sorcerer`, `skill.spark-1`, `item.ring`, `paragon.board-1`. IDs must match the actual build allocation/milestone IDs to resolve there. Imports are at most 5 MB and 4096 × 4096 pixels, decoded and re-encoded as PNG, SHA-256 addressed and saved privately in `%LOCALAPPDATA%/DiabloBuildCompanion/assets/`. Source, category, compatible patch, checksum and filename are recorded in state.

Resolution: a compatible private import → original generic component icon. No distinct installed-game resource provider exists until an authorized mechanism is established. Patch-specific metadata can be edited via a workspace backup; UI imports apply to all patches. Missing files, checksum mismatch or incompatible metadata falls back safely. Import replacement updates the manifest ID; clearing local data removes the private cache. No user asset is included in Git or installer exports.

Do not use CASC/archive extraction, circumvent protections or assume a purchased game gives redistribution rights. Installed game location is intentionally not accessed. See COMPLIANCE.md and CONTRIBUTING.md.
