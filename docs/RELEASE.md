# Release records

## v0.2.0 — private Steam artwork

Prepared on 2026-10-13. Adds a read-only static Steam archive worker, BC1/BC3/RGBA8/R8 conversion, original sprite browser/assignments and an optional private theme in desktop/overlay. The shipped package contains extractor code, numeric placement recipes and original fallback artwork. Game PNGs and private previews remain outside Git and packaging.

Local Windows validation passed: lint, formatting, types, 35 unit/integration tests, six desktop/visual tests, four packaged-app tests against both the unpacked distribution and a real NSIS installation, and actual portable-wrapper OCR/restart. NSIS install/uninstall returned 0 and removed the test executable. The packaged application also indexed/extracted the owner's real Steam build, read 1,311 private resources and displayed its theme in the main window and overlay. One unavailable skill-tree archive was skipped. This does not verify live-game capture or publisher/anti-cheat approval.

ASAR inventory inspection confirmed the unpacked extraction worker and MIT notices and found no private library index, extracted hash-named PNGs or scratch probe. The asset guard verifies 14 original/licensed files. The first [v0.2 CI run](https://github.com/ldallacqua/diablo-build-companion/actions/runs/38477868430) passed all application/packaged tests but timed out waiting 45 seconds for the portable wrapper. The smoke harness now permits a bounded 180-second cold startup on CI, detects early process exits and records diagnostics. No application code or release executable changed for that test-harness repair. CI and publication status will be recorded after the remote checks complete.

| Artifact                       | Bytes     | SHA-256                                                            |
| ------------------------------ | --------- | ------------------------------------------------------------------ |
| Sanctum-0.2.0-x64-Setup.exe    | 138149763 | `7339d0edc136be0a2a513eec4fe4943d7a1a1fb63a1f58d09f30f3eb1c3d7cda` |
| Sanctum-0.2.0-x64-Portable.exe | 137907024 | `e6e42b3a01f86132bda1bdb0d80eb97ee76af70f85faf1d34aee34dae3d550db` |

Both packages are unsigned x64 prerelease builds. Battle.net, encrypted entries and unsupported texture codecs are not supported. No signing certificate or automatic updater is used. See EXTRACTION.md and TESTING.md for detailed limits.

## v0.1.0

This release is an unsigned Windows x64 MVP/prerelease. Its source, screenshots, data fixtures and license manifest are public; private assets and screenshots are excluded.

Release date: 2026-10-13. Repository: [ldallacqua/diablo-build-companion](https://github.com/ldallacqua/diablo-build-companion). Distribution page: [v0.1.0](https://github.com/ldallacqua/diablo-build-companion/releases/tag/v0.1.0).

Published as a public prerelease at 2026-10-13 21:41:57 UTC, tagged at `8f3851c0b61a19a599ddb22817c87234ac3b907e`. GitHub's uploaded asset sizes and SHA-256 digests matched all three local release files before publication. This post-publication record and checklist update do not alter the tagged runtime.

[Windows CI run 38471383483](https://github.com/ldallacqua/diablo-build-companion/actions/runs/38471383483) succeeded for commit `36b1da36ff01cf93b0778ede1f7bdf57b906b455`: lint, formatting, types, 30 unit/integration tests, production build, asset provenance, 5 desktop/visual E2E tests, NSIS/portable packaging, 3 packaged-app tests and actual portable-wrapper OCR/restart verification. The subsequent release-record documentation commits do not change application/runtime code.

The distributed binaries were built and tested locally on Windows 11 x64. Real NSIS installation and uninstallation returned exit code 0; all three packaged-app tests passed against the installed executable and uninstall removed the temporary installation directory. The actual portable executable passed extraction, startup, local OCR, STASH verdict, clean exit and persisted restart. The CI runner separately rebuilt and verified the same runtime. Original tooltip fixtures were used; actual Diablo IV/HDR/anti-cheat, Windows 10 and physical mixed-DPI verification remain outstanding in TESTING.md and COMPLIANCE.md.

Artifacts are produced as `Sanctum-0.1.0-x64-Setup.exe` (NSIS, per-user, selectable location, no elevation) and `Sanctum-0.1.0-x64-Portable.exe`. Both include the local English OCR model and required license notices. SHA256SUMS.txt accompanies the release. No signing certificate is used and there is no automatic updater.

| Artifact                       |     Bytes | SHA-256                                                            |
| ------------------------------ | --------: | ------------------------------------------------------------------ |
| Sanctum-0.1.0-x64-Setup.exe    | 138116421 | `b29c3a11e0d74854a1d5a29ba8515851369a5c94f91b11408e58614134abab6b` |
| Sanctum-0.1.0-x64-Portable.exe | 137873676 | `3e28a89ecbcc2ae14a72a9103108ef37375c321c935a06d97a30c9868f1af045` |

These hashes identify the local tested release files, not an assumption that timestamped local/CI packages are byte-for-byte reproducible. Inter's full OFL license, the OCR model's Apache license and Electron/Chromium notices are included. No proprietary game assets or private screenshots are distributed.

The NSIS compiler requires ordinary-length dependency paths on Windows; pnpm is configured with a hoisted node linker to avoid nested paths exceeding its file-access limit. The runtime still separates renderer and host and unpacks the OCR worker/core packages for actual Node worker execution.
