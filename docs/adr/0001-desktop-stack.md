# ADR 0001 — Electron host with React / strict TypeScript

Status: accepted, 2026-10-13.

Tauri 2 offers a smaller runtime and memory footprint but requires Rust, Microsoft C++ tooling and WebView2, plus native capture/OCR bindings. This environment had no Rust toolchain. Native C#/WinUI offers Windows APIs directly but no .NET SDK was installed; a separate UI/runtime bridge would add work.

Electron has supported display enumeration, desktop snapshots, global shortcuts, transparency, click-through and per-user packaging. Local Tesseract WASM avoids native OCR deployment dependencies. A single TypeScript domain layer serves renderer tests and host validation. We choose Electron for this working slice, accepting larger artifacts and memory usage. The IPC boundary leaves a future Tauri host possible without rewriting rule logic. This is an engineering tradeoff, not a claim Electron consumes less memory.
