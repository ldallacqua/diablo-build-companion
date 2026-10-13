# Research log

Researched 2026-10-13 (America/Sao_Paulo). Source access and publisher permission are separate. This is an engineering record, not publisher authorization or legal advice.

## Live game data and change risk

The [official Season of Hell's Legacy article](https://news.blizzard.com/en-us/article/24295394/celebrate-30-years-of-diablo-in-season-of-hell-s-legacy) includes 3.2.1 notes dated September 15, 2026. It describes new legacy uniques and changes to crafted Mythic items, including a Crafted restriction and preserved item modifications. It also lists class availability for newer classes. This shows why a historical fixed six-class catalogue or old itemization formula would be unsafe. The MVP accepts class names, patch metadata and explicit priorities; it does not enforce unverified live caps or crafting outcomes. The bundled 800-power examples are original synthetic test data, not claims about current maximum item power.

The [official itemization/system rework article](https://news.blizzard.com/en-us/article/24243142/sanctuary-ignites-with-itemization-systems-changes) and [2.5 patch notes](https://news.blizzard.com/en-us/article/24244466/diablo-iv-patch-notes-2-5) describe changes to affixes, greater-affix item progression, tempering/masterworking and defenses. The 2.5 notes include quality-based masterworking and a final affix upgrade. They are historical baselines, not sufficient to assert the complete current ruleset. The app retains greater markers and explicit crafting text but does not calculate crafting probabilities or affix ceilings.

The Blizzard-authored [2026 skill tree rework overview](https://news.xbox.com/en-us/2026/04/22/diablo-4-skill-tree-overhaul/) describes expanded branching across classes. The MVP therefore stores ordered allocations, ranks and upgrade labels supplied by users, without deriving point availability from level. Paragon data is stored as board/glyph milestones; no topology, node count, point cap or geometric route is invented. Current season-specific skills, equipment restrictions, roll ranges, transition dependencies and routes remain the guide author's/user's responsibility.

Equipment recognition covers common armor, jewelry, weapons/offhands and current charm/seal categories conservatively. Unknown category, natural-language powers or unreadable affixes require review. These categories are a parser vocabulary, not a complete authoritative equipment catalogue. Aspects and uniques match supplied names. Build variants are separate imported configurations; transition criteria are explicit, not inferred from a variant label.

## Character information

| Method                | Findings / MVP decision                                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local character saves | No supported character-save format was verified. Do not scan installations or assume an offline save exists.                                                                                                                                                                                           |
| Blizzard API          | The [Battle.net developer portal](https://community.developer.battle.net/documentation) was inspected but its client-rendered catalogue was not fully accessible. No supported Diablo IV character endpoint was verified. This is not proof that none could ever exist. No API is invented or shipped. |
| Screenshot            | OS-supported snapshots are feasible; one explicit frame is cropped to a user-defined display region.                                                                                                                                                                                                   |
| OCR                   | Local English Tesseract WASM works on the original fixture and native captured screen text. Confidence and correction remain essential.                                                                                                                                                                |
| Image recognition     | No automatic tooltip finder or game-state inference is shipped; insufficient verified data.                                                                                                                                                                                                            |
| Manual input          | Always available for tooltip text, builds, level, allocation checklists and ownership.                                                                                                                                                                                                                 |

## Maxroll

Attempts to open `https://maxroll.gg/robots.txt`, the Chain Lightning leveling guide and `/terms-of-service` returned non-retryable access errors in the research browser. Current guide HTML, planner payloads, redistribution terms and automation permission could not be verified. We did not bypass the restrictions. No scraper, private endpoint or claim of parsing current Maxroll HTML is included. HTTPS Maxroll Diablo IV URLs are validated reference links; manual and versioned JSON imports are fully functional fallbacks. Attribution is stored with each build, and proprietary guide content is not bundled.

## Windows capture, OCR and overlay

[Microsoft's screen capture documentation](https://learn.microsoft.com/en-us/windows/apps/develop/media-authoring-processing/screen-capture) describes supported display/window capture APIs and user selection. Native Windows.Graphics.Capture was evaluated for a Rust/C# host; this release uses [Electron desktopCapturer](https://www.electronjs.org/docs/latest/api/desktop-capturer) instead. It requests screen sources once per trigger, selects the exact display ID and crops using actual thumbnail dimensions. It is not a direct custom WGC implementation. Borderless desktop composition is the intended mode. Protected surfaces and exclusive fullscreen may yield blank results; upload/manual input remains available.

[Tesseract local installation guidance](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md) supports local language paths. Node resolves the packaged worker/core; the English model has a committed SHA-256 lock. Windows OCR was considered but may depend on Windows language packs and native bindings; Tesseract makes offline packaging reproducible at the cost of a larger runtime/model. Portuguese OCR is not implemented.

[Electron window documentation](https://www.electronjs.org/docs/latest/api/base-window) documents always-on-top, transparency, opacity, click-through and window bounds. Native tests found software rendering necessary on the test PC and `screen-saver` level necessary for the topmost assertion. Neither finding establishes game/anti-cheat compatibility. Logical-size/DPI layouts were tested; mixed physical-monitor setups remain manual validation. See ADR 0004 and TESTING.md.

## Policy and assets

The [Blizzard EULA](https://www.blizzard.com/en-us/legal/simple/bfbbb648-bcc6-4b78-a5c7-e2fe20c135df/blizzard-end-user-license-agreement) has broad restrictions on unauthorized software, gameplay facilitation, data mining and platform modification. Screenshots and independent windows were not found to have an explicit Diablo IV-specific authorization in the material reviewed. We do not imply approval. COMPLIANCE.md records the remaining risk and standalone fallback.

No official local archive-extraction API or redistribution permission was established. After the initial v0.1 release, the owner explicitly requested extraction of their installed Steam artwork with no game pixels published. We investigated static key layouts, TVFS, CoreTOC/combined texture metadata and mip payloads using MIT format references and the local installed build. The TypeScript worker reads unencrypted entries only and keeps SHA-addressed PNGs outside Git. Owning a copy is not treated as an asset license or publisher authorization. See [EXTRACTION.md](EXTRACTION.md) for pinned references, measured results and unsupported formats.

## Open questions

- Publisher confirmation for screenshot-analysis/overlay usage and mode-specific compatibility.
- A permitted Maxroll interface and a rights-cleared, patch-specific import contract.
- Complete current affix dictionaries, natural power text and localized tooltip fixtures.
- Real Diablo IV capture latency, low-contrast OCR, HDR and mixed-DPI/multi-monitor behavior.
- Battle.net support, additional texture codecs and future-build format/handle compatibility; publisher confirmation remains unresolved.
