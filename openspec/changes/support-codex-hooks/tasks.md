## 1. Codex Setup Integration

- [x] 1.1 Extend `gitnexus/src/cli/setup.ts` so Codex setup enables the `codex_hooks` feature flag without overwriting unrelated `~/.codex/config.toml` settings.
- [x] 1.2 Add Codex hook installation and merge logic for `~/.codex/hooks.json`, including idempotent GitNexus-owned entries and supported-platform handling.
- [x] 1.3 Copy bundled GitNexus Codex hook assets to a stable user-level path and wire setup output so Codex hook installation is reported clearly.

## 2. Codex Hook Runtime

- [x] 2.1 Add a Codex-specific hook script under `gitnexus/hooks/codex/` that reads Codex hook input, validates supported Bash events, and emits Codex-compatible hook responses.
- [x] 2.2 Port the GitNexus stale-index detection flow to the Codex hook adapter and preserve the existing embeddings-aware reminder behavior.
- [x] 2.3 Implement safe pattern extraction for supported Bash search commands and emit GitNexus augmentation only when the current Codex response shape supports it cleanly.

## 3. Docs And Validation

- [x] 3.1 Update Codex-facing README/setup documentation and support matrices to describe Codex hook support, the `codex_hooks` requirement, Bash-only scope, and current platform limitations.
- [x] 3.2 Add or update setup and hook tests covering config merging, idempotent installation, unsupported-platform behavior, and Codex hook output contracts.
- [x] 3.3 Run targeted validation for the Codex setup and hook surfaces and confirm the implementation matches the new `codex-hook-support` spec.
