# Validation record

Validation date: 2026-10-13. Local target: Windows 11 x64 (build 26200), Electron 44.7.0, Node 24, React 19, TypeScript 6.0.3. Automated fixtures use no game installation. A separate private extraction check reads the owner's installed Steam files without running or accessing a game process. Results must not be interpreted as publisher/anti-cheat approval.

## Automated checks

v0.2.1 design correction: 38 unit/integration and seven native desktop tests passed locally. The additional theme regression uses original synthetic pixels and checks normal/hover/pressed/reset/disabled artwork, keyboard focus, navigation hover reset, alpha-padding correction and unchanged utility-icon meaning. Migration tests preserve manual assets, custom theme bindings and exact class-scoped skill lookups. Original fallback screenshot baselines continue to pass without replacing them with game-art images. Private real-art screenshots separately exercise the curated preset and verified Spark/Chain Lightning artwork. Packaged results are recorded in RELEASE.md after completion.

- 35 unit/integration tests passed: exact item/affix parsing, aliases, greater markers, preserved crafting text, low confidence, active/future verdicts, incomplete/unique discard protection, unit-aware equipped comparisons, skill/milestone progression, transition conditions/actions, partial JSON normalization, matching-class imports, URL validation, migration, atomic storage, corrupt-file handling, fallback resolution and actual OCR of two original PNG fixtures. Added original synthetic Steam TVFS/texture archives, source preservation/cache confinement, BLTE N/Z and encrypted rejection, invalid manifests/layouts, BC3 alpha/padded pitch and transparent-centred frame assembly.
- 6 Windows Playwright/Electron tests passed: onboarding → OCR upload → STASH FOR ENDGAME → skill progress → accepted transition → KEEP → restart/persistence; native topmost/transparent/opacity overlay plus click-through recovery; real private raster-cache write/read/checksum/missing-file handling; extractor-worker indexing/conversion, sprite browsing, semantic assignment, optional theme persistence/disable; seven original-theme screenshot views; logical 1080p, 1440p, 4K at 200% zoom and compact desktop containment.
- 4 packaged Windows tests passed against both the v0.2 unpacked distribution and a real NSIS installation: OCR/progression/restart flow, native overlay, private image cache and real extraction worker with original miniature archives. The installer and uninstaller returned 0; the test executable was removed. The actual portable wrapper passed startup, bundled OCR, verdict, clean exit and persistence. Historical v0.1 results remain recorded in RELEASE.md.
- Type checking, lint and formatting checks are required before every release. Licensing/hash guards cover all committed raster/vector/font assets and forbid known archive/private-resource patterns.
- The main source workflow and packaged-app validation commands are in `.github/workflows/ci.yml`. Remote run links/status are recorded in RELEASE.md after completion, never inferred from local checks.

Visual baselines were viewed and revised during development. `tests/visual/visual.spec.ts/` contains Dashboard, Item Advisor, Skills, Paragon, Transition, Settings and Overlay screenshots. The E2E launcher fixes renderer device scale to 1 and color profile to sRGB; visual tests use a fixed viewport and bundled Inter font. This avoids physical desktop-size/DPI raster differences between Windows 11 and the Windows Server runner while retaining strict pixel comparison. Use `pnpm test:e2e` to compare; use `--update-snapshots=all` only after intentional visual review, then update manifest hashes. Layout-size tests exercise logical window dimensions and browser zoom, not a claim that three different physical displays were tested. Native UI automation and actual desktop frame capture were also inspected separately with the ordinary display configuration.

## Actual global-hotkey smoke test

`node scripts/hotkey-smoke.mjs` launches an isolated user-data directory and a native window showing the original synthetic tooltip. A real Windows `Ctrl+Shift+D` keypress triggered display capture, cropping, local OCR, parsing and STASH FOR ENDGAME. The successful run recognized RING OF THE TEMPEST, Critical Strike Chance and Attack Speed with 81% combined recognition confidence. This interactive test is not claimed as a CI test. Its output directory is gitignored and contains no distributed private screenshots.

An initial native test exposed blank hardware-rendered surfaces; software rendering fixed it. An ordinary topmost level also failed before `screen-saver` was selected. Both failures were investigated and corrected, not reported as passes. The fixture is fictional and no actual game compatibility claim follows from this result.

## Performance

See BENCHMARK.json for raw samples. The original 720 × 540 image passed through actual desktop image decoding/resizing, Tesseract worker and IPC. The first OCR took 320 ms, subsequent OCR samples 178–187 ms; upload-to-result took 200–359 ms. These are synthetic-tooltip measurements on one PC, not a gameplay latency guarantee. Total measured private memory was 329 MB after scanning and 268 MB after the OCR worker was released; Electron is a material memory cost. Working-set sums include shared Electron pages and transient OCR allocations and are not private-memory estimates. The OCR worker terminates after 15 seconds without another request to release its WASM memory, reinitializing on the next scan. No continuous recording runs.

## Commands

```powershell
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm assets:check
pnpm test:e2e
pnpm package:win
$env:SANCTUM_PACKAGED_EXE = (Resolve-Path 'release/win-unpacked/Sanctum.exe').Path
pnpm exec playwright test tests/e2e/flow.spec.ts tests/e2e/gameAssets.spec.ts tests/e2e/theme.spec.ts
```

Packaged validation exercises real shipped OCR paths/resources, not source module mocks. Installer installation/uninstallation and portable startup are separately noted in RELEASE.md. Do not label them tested until performed.

`node scripts/portable-smoke.mjs` passed against the actual portable wrapper: extraction, startup, real bundled OCR, STASH verdict, clean process exit and persisted restart. It uses a temporary loopback renderer debugging port because the NSIS wrapper does not forward the Node inspector stream expected by Playwright's Electron launcher. That earlier launcher attempt timed out and is not counted as a pass. Test data is isolated and removed.

## Remaining manual Windows/game checks

Separate local asset check: `scripts/game-assets-smoke.mjs` passed against both the source app and v0.2 packaged app with Steam build `24505340-24505359`. It exercised real installation indexing, core extraction, private sprite reads, theme application and the overlay. It produced 1,311 private resources; one unavailable skill-tree archive was reported as skipped. All real-art previews remained outside Git. An ASAR content inspection found no private index, extracted hash-named PNGs or scratch probe, and verified the unpacked extractor and bundled MIT notices. This is distinct from a live-game capture test.

For a private repeat, set `SANCTUM_PRIVATE_CACHE` and `SANCTUM_PRIVATE_PREVIEWS` outside the repository, optionally `SANCTUM_GAME_INSTALLATION` to re-index/extract and `SANCTUM_PACKAGED_EXE` to test the distribution. Never upload these screenshots or cache files as CI artifacts. CI runs only original synthetic archives and original fallback visuals.

1. In a permitted environment, open Diablo IV in borderless mode and compare native captured pixels with the intended tooltip. Try English tooltips across rarity, power, affix, tempering, greater-affix and masterworking variants. Verify uncertain lines require review.
2. Try real 100/125/150/200% scaling, HDR/SDR and mixed monitors with negative desktop origins. Disconnect the selected display and ensure the capture error is clear; restore the overlay to a connected work area.
3. Verify hide/show, compact sizing, opacity, click-through recovery and persisted drag position while focus stays in game. Do not assume exclusive-fullscreen support.
4. Run Windows 10 x64 and publisher/anti-cheat compatibility checks where allowed. Stop if capture is prohibited, blank or unreliable; use a standalone companion and screenshot upload.
5. Review unsigned package prompts without bypassing security controls. Verify a normal per-user install and uninstall behavior, including retained personal builds.

No unavailable or unreliable manual check is counted as passed.
