# Contributing

Read AGENTS.md, docs/COMPLIANCE.md and docs/ASSETS.md first. Keep rule changes in the domain layer, provide meaningful fixtures and verify Windows behavior. Provide source date and patch metadata for mechanics changes. Submit only content you created or have redistribution rights for.

Never commit installed game files, extracted textures, guide prose, private tooltips, local state, credentials or captured desktop screenshots. Synthetic application test images are allowed with provenance and manifest entries. The asset guard checks hashes and records, not legal ownership.

Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` and `pnpm assets:check`. Review screenshot changes before updating baselines and their manifest hashes. Keep private caches out of source control.
