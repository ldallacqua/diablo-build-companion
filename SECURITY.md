# Security

Report vulnerabilities privately through GitHub private vulnerability reporting if enabled, or contact the repository owner before disclosing exploit details. Do not submit credentials or private screenshots in issues.

The renderer has no Node integration, uses context isolation and sandboxing, and can invoke only named preload operations. IPC checks the owning WebContents and validates data with Zod. Navigation, new windows, webviews, permission requests and renderer HTTP requests are blocked. External links are user-triggered and restricted to HTTPS Maxroll Diablo IV references. Image decoding has byte/dimension caps; imported assets are normalized to PNG, addressed by checksums, and read only through manifest IDs. OCR runs locally in a separate WASM worker.

There is no automatic update channel in v0.1.0. Keep Electron and dependencies patched. A hostile local user with filesystem access can modify this unsigned application. This version loads packaged file URLs and relies on strict CSP and blocked navigation; a custom origin and Electron fuse hardening are future work.
