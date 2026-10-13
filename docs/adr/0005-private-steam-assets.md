# ADR 0005 — Optional private Steam artwork

Status: accepted, 2026-10-13. Supersedes only the archive-extraction exclusion in ADR 0002.

The owner requested real installed-game borders, corners and icons, with only extractor code published. Implement a read-only worker for unencrypted Steam static archives and a private asset browser/theme. Keep Battle.net support and unsupported codecs explicit rather than silently guessing. Do not use keys, bypass protected entries, access a live game process or alter the installation.

Publish recipes, parser/decoder code and original synthetic tests. Keep the game cache and real-art previews outside every Git repository and packaging inputs. Verify content-addressed images before use. Preserve original fallback artwork, ordinary overlay windows and manual gameplay state. Owning a copy and user authorization do not establish publisher approval or redistribution rights.
