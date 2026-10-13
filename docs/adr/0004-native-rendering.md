# ADR 0004 — Software rendering and window-level validation

Status: accepted, 2026-10-13.

On this Windows validation PC, hardware-rendered Electron surfaces could be accessed through browser automation yet appeared blank to native screen capture. A real shortcut test captured underlying desktop content rather than the original fixture. `app.disableHardwareAcceleration()` made the fixture visible and allowed the native capture/OCR pipeline to recognize its affixes. We keep software rendering as the default for this static UI and document the tradeoff; game capture uses a single native desktop frame, not software gameplay rendering.

The ordinary `floating` window level failed the native always-on-top assertion on the validation PC. The documented `screen-saver` level passed. The overlay uses that level and reasserts it after showing/resizing. It is still an independent OS window and has no exclusive-fullscreen guarantee. A future GPU opt-in needs native visual validation on multiple GPUs and actual game modes.
