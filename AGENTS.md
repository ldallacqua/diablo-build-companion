# Sanctum / Diablo IV Companion

Sanctum is a Windows, local-first two-build item advisor. Its core flow is user-triggered screen capture or image upload → local OCR → exact parser → deterministic explanations → optional overlay. Treat v0.2.0 as a tested MVP with limited tooltip coverage and optional private Steam artwork, not an authoritative seasonal planner. The original examples are deliberately synthetic.

## Workflow and commands

Use Node 24, pnpm 11.25.0 and Windows for native validation. `pnpm install --frozen-lockfile`, `pnpm exec install-electron`, `pnpm ocr:prepare`. Build scripts are explicitly permitted in pnpm-workspace.yaml; do not enable arbitrary dependency scripts. `pnpm dev` runs the browser UI; native OCR and overlays require `pnpm start`. Never describe the browser preview as the desktop application.

Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm assets:check`. `pnpm package:win` creates NSIS and portable artifacts. No signing credential is expected. Do not publish untested artifacts or claim CI passed until the remote run completes. Keep commits logically grouped.

## Architecture and ownership

- `desktop/`: Electron lifecycle, named/validated IPC, screen capture, global hotkeys, local OCR worker, filesystem persistence and private asset cache. No renderer Node APIs.
- `src/domain/`: versioned Zod schemas, pure item parsing, rules and progression. No Electron, React, network or filesystem imports here.
- `src/services/`: build adapters, normalization, migrations and semantic asset lookup.
- `src/app/`: state orchestration; serialize native writes and surface errors.
- `src/features/`: views only. Shared primitives and tokens live in components and design-system.
- `tests/fixtures/`: original synthetic inputs; actual OCR integration runs in tests/integration.

Use strict TypeScript, descriptive camelCase functions, PascalCase components, stable kebab-case data IDs and exact semantic asset IDs (`skill.*`, `item.*`, `class.*`, `paragon.*`). Keep functions small enough to understand, avoid circular imports and preserve explicit uncertainty. Validate all imported/IPC data. State version 2 and build version 1 are independent; add explicit migrations and tests instead of silently accepting future versions.

## Adding an importer

Implement the BuildImporter contract in services/importers. Investigate permission and access policies first. Keep website parsing outside domain logic. Return BuildSchema-validated, attributed, dated data with coverage `partial` unless its full equipment priorities were reviewed. Missing skill steps, paths or powers remain missing. Never bypass CAPTCHA, anti-bot protection or access controls. Maxroll currently uses reference links plus manual/JSON data; no scraper or unpublished API is shipped.

## Adding rules and OCR cases

Add pure rules in domain/recommendations with structured matches, reasons and cautions. Always consider both builds. Unknown text and incomplete data must never become a definitive discard verdict. Upgrade candidates need comparable recorded equipped data and no missing primary roll comparisons. Never hardcode specific item names into rules.

Add an original tooltip PNG and expected normalized properties under tests/fixtures. Test real offline recognition, alias exactness, unknown lines and low confidence. Preserve raw text for correction. Do not "fix" tests by mapping OCR noise to guessed affixes. Native screenshot fixture testing is distinct from game compatibility testing. `scripts/hotkey-smoke.mjs` requires a real OS keyboard trigger and is a manual smoke test, not an unattended CI test.

## Updating game mechanics

Read current official Blizzard patch notes, record date and patch in docs/RESEARCH.md, and distinguish historical mechanics from live facts. The MVP stores explicit guide steps and targets rather than calculating skill points, Paragon topology or crafting outcomes. Do not infer an API, local character save format or board connectivity. Imported class names remain extensible. Seasonal data updates require provenance and regression fixtures.

## UI and accessibility

Use the charcoal, restrained gold/bronze design tokens. Respect surface hierarchy and reuse Panel, Badge, Button, AssetIcon and focus scopes. Provide error, empty and busy states. Use labelled inputs, accessible button names, keyboard focus visibility and reduced-motion behavior. Test the actual Windows UI, compact overlay, 1080p, 1440p and 4K logical layouts and zoom. Keep product copy useful; implementation details belong in docs unless necessary for a user decision. Review screenshots before `--update-snapshots=all`. Baseline pixels and licensing hashes change together.

## Security, assets and privacy

Never read game memory, inject DLLs, automate game actions, intercept packets, bypass DRM or claim Blizzard approval. The project owner's explicit 2026-10-13 request authorizes read-only extraction of unencrypted UI resources from their installed Steam copy, with all extracted pixels kept outside Git and releases. This supersedes the previous archive-extraction exclusion. See docs/EXTRACTION.md. Do not add keys, protected-content bypasses, downloads or writes into the installation. User-triggered screen snapshots and manual game state remain the only gameplay integration. Screenshot processing stays in memory; only the latest extracted item text is persisted. There are no uploads, telemetry or cloud accounts. Native links must retain strict host/scheme allowlists. Don't weaken CSP, sandbox, context isolation, IPC sender checks or size bounds to solve a test failure.

Imported assets belong in the app's private `%LOCALAPPDATA%/DiabloBuildCompanion/assets` cache, never the repository or release. Re-encode raster imports to PNG and validate checksum filenames on read. Missing/incompatible/corrupt assets use original generic icons. Add distributable original resources to resources/asset-licenses.json; `scripts/update-asset-manifest.mjs` calculates hashes but does not establish rights. Record all third-party licenses. No Blizzard images, proprietary guide prose or private desktop screenshots may be committed.

## Definition of done

The behavior works, appropriate tests pass, native changes have a Windows smoke test, visuals were actually inspected, persistence and failure paths remain safe, documentation/checklist reflect real limitations, assets have provenance, the production build and relevant packaged app pass. A successful compile, mocked capture or generated baseline alone is insufficient. See docs/TESTING.md for outstanding real-game/manual checks.
