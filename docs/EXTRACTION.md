# Private Steam UI extraction

The project owner's 2026-10-13 request added read-only extraction from their installed Steam copy. This replaces the earlier v0.1 exclusion. All game pixels remain private; GitHub and installers contain extractor code, numeric resource recipes, original synthetic fixtures and original fallback artwork only. No publisher authorization or redistribution license is claimed.

## Use

Settings → Diablo IV asset library → Choose game folder → Extract core UI pack → Use Diablo IV theme. Select the folder containing `Data/.build.config`, for example `C:\Steam\steamapps\common\Diablo IV`. The extractor supports Steam static archives. Battle.net CASC installations are not supported yet.

The core pack selects 22 UI atlases: frames, panel/modal art, buttons, tiled surfaces/dividers, inventory glyphs/tabs, class crests, equipment-slot pictograms, five class skill atlases, skill tree, generic Paragon and aspect icons. The gallery displays individual atlas sprites and the assembled frame. The preset includes verified skill-name recipes, class crests and slot pictograms; see DESIGN_SYSTEM.md for the exact-name lookup and provenance. Unknown mappings remain generic. Search an atlas, select a sprite and assign its semantic ID, such as `texture.button`, `class.sorcerer`, `skill.spark-1` or `item.ring`, to override a specific asset. A bare numeric handle never establishes a skill identity by itself.

Game artwork enabled switches the optional theme in both the main application and overlay. Sanctum keeps its own layout, typography and branding. Missing resources use available original fallbacks. Read failures, checksum mismatch and a mismatched installed build suppress private images. Additional UI atlases can be selected after indexing. The host remains responsive while a separate worker reads and converts archives. Cancel stops that worker.

## Implementation

`desktop/extraction/steam.ts` reads the static key layouts in `.build.config`, nested TVFS manifests and local meta/payload/child files. Archive descriptors are opened read-only. Supported BLTE blocks are unencrypted N/Z; encrypted E blocks are rejected. Zlib manifests are decompressed locally. There are no keys, remote fetches, process access or installation writes.

`textures.ts` reads CoreTOC texture names, combined texture metadata, shared payload references and sprite rectangles. BC1, BC3, RGBA8 and R8 mip zero are decoded with padded row-pitch support. Unsupported formats, unavailable archives and encrypted entries are reported as skipped. BC7 and other compression codecs remain unsupported. The dimension ceiling is 32,768 per axis and 32 million pixels, to cover long class atlases without unbounded allocation.

`frame.ts` assembles eight original tooltip-frame pieces into a transparent-centred 171 × 171 PNG suitable for CSS nine-slice borders. This is a placement recipe containing handles only. The native PNG encoder preserves RGBA transparency. No generated approximations replace extracted pixels.

Per-entry reads are bounded to 512 MB, extraction to 150 selected atlases and 300 MB of encoded output per operation. The desktop worker has a 180-second timeout and bounded output. Cache/index files are schema checked; PNG filenames and reads are SHA-256 verified. Cache paths are resolved through existing ancestors and must be outside the installation, application and every Git repository. Symlink/junction escape and conflicting cache files are rejected. New index writes use an atomic rename; cancel can leave unreferenced content-addressed PNGs which Clear Local Data removes.

## Storage and command line

The desktop cache is `%LOCALAPPDATA%\DiabloBuildCompanion\assets\` with `game-library.json` alongside it. Workspace JSON exports contain assignments and provenance, not image bytes or archives. Importing an exported workspace on another PC requires a matching local cache or re-extraction. Clearing local data removes both imported and extracted art.

For development, use a private output directory outside the repository:

```powershell
pnpm host
node dist-host/extractor.cjs --inspect --installation 'C:\Steam\steamapps\common\Diablo IV'
node dist-host/extractor.cjs --extract --installation 'C:\Steam\steamapps\common\Diablo IV' --output 'C:\Users\YourName\AppData\Local\SanctumPrivateAssets'
```

Optional `--selection <file.json>` takes an array of exact atlas names. Stdout contains the result JSON; stderr contains progress/error JSON lines. The installed Electron application provides the Node worker runtime; no .NET SDK or Python is required by users.

## Evidence and format references

On 2026-10-13 the owner's installed Steam build `24505340-24505359` indexed 1,674,099 entries. The core pack produced 1,311 private PNG resources, including the assembled frame. `2DUI_SkillTree` was skipped because a required local archive was unavailable. Main-window and overlay screenshots were inspected privately outside Git. This verifies asset extraction, not in-game capture or anti-cheat compatibility. Future game updates may change formats or handles.

Format research used MIT references: [WiseOwl.Casc](https://github.com/WiseOwlSoftware/WiseOwl.Casc) at `bb6f084a6f5480b91197f8cc8ad3c022dbf4f821`, [TACTLib](https://github.com/overtools/TACTLib) at `129f977b604b2576bfd048e0f2be8b44ee983f39`, and [d4-asset-extractor](https://github.com/game-strategy-hq/d4-asset-extractor) at `a2527e58f64dba72c423c8f6e978ce39605d9278`. Full MIT notices are bundled in `resources/extraction-notices.txt`. The Steam layout distinction was also researched in [rustydemon](https://github.com/HoldMyBeer-gg/rustydemon); no Rust library, AGPL source, DRM keys or game bytes are incorporated.

Automated tests generate original miniature archive structures in a temporary directory. CI never accesses a game installation, extracts Blizzard art or uploads private previews. `scripts/game-assets-smoke.mjs` requires explicitly supplied cache/preview paths outside Git and is a local-only check.
