# v0.1.0 release record

This release is an unsigned Windows x64 MVP/prerelease. Its source, screenshots, data fixtures and license manifest are public; private assets and screenshots are excluded.

Source and native tests pass locally. Final package, remote CI and publication status will be recorded here after they are verified. Current physical-game limitations are in TESTING.md and COMPLIANCE.md.

Artifacts are produced as `Sanctum-0.1.0-x64-Setup.exe` (NSIS, per-user, selectable location, no elevation) and `Sanctum-0.1.0-x64-Portable.exe`. Both include the local English OCR model and required license notices. SHA256SUMS.txt accompanies the release. No signing certificate is used and there is no automatic updater.

The NSIS compiler requires ordinary-length dependency paths on Windows; pnpm is configured with a hoisted node linker to avoid nested paths exceeding its file-access limit. The runtime still separates renderer and host and unpacks the OCR worker/core packages for actual Node worker execution.
