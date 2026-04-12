## Context

GitNexus currently has an asymmetry across agent integrations:

- `gitnexus setup` configures Codex MCP and installs Codex skills
- Claude Code also gets bundled hooks and hook registration
- Codex gets no GitNexus hook installation, even though Codex now documents an experimental hook system

The official Codex hook model has materially different constraints from Claude Code:

- hooks are enabled through `[features] codex_hooks = true` in `~/.codex/config.toml`
- hook registrations live in `hooks.json` next to active Codex config layers, with `~/.codex/hooks.json` and `<repo>/.codex/hooks.json` as the main locations
- current `PreToolUse` and `PostToolUse` matcher support is limited to `Bash`
- hooks are currently disabled on Windows
- `PreToolUse` cannot provide the same additional-context augmentation that Claude's `PreToolUse` hook supports, so direct feature parity is not possible

This change should add Codex hook support without pretending Codex exposes the same hook surface as Claude Code.

## Goals / Non-Goals

**Goals:**

- Add first-class Codex hook installation to `gitnexus setup`.
- Enable the Codex hook feature flag and merge GitNexus hook registrations without clobbering existing user config.
- Provide Codex hook behavior that matches current Codex capabilities and still delivers GitNexus value in indexed repositories.
- Make Codex hook coverage and limitations explicit in tests and docs.

**Non-Goals:**

- Reproducing Claude Code's Grep and Glob interception in Codex.
- Building a repo-local `.codex/hooks.json` generator in this change.
- Adding new third-party packages or a generic multi-editor hook abstraction.
- Supporting Windows before Codex hooks officially support it again.

## Decisions

### 1. Install Codex hooks globally through `~/.codex/hooks.json`

`gitnexus setup` is already a global setup flow, so Codex hook support should follow the same pattern. The setup command should merge GitNexus entries into `~/.codex/hooks.json`, and it should copy bundled hook scripts into a stable user-level location such as `~/.codex/hooks/gitnexus/`.

Why:

- this matches the current setup model used for Codex MCP and Claude hooks
- global installation avoids mutating each repository just to enable GitNexus hook behavior
- a copied user-level script path is more stable than relying on package-relative paths from inside the npm tree

Alternatives considered:

- Write repo-local `.codex/hooks.json` files during `gitnexus analyze`: rejected because hook installation belongs to setup, not indexing, and would mutate repositories unexpectedly.
- Reference packaged hook scripts in place: rejected because package-relative paths become brittle after global installation and upgrades.

### 2. Add a Codex-specific hook adapter instead of reusing the Claude hook script directly

GitNexus should add a dedicated Codex hook script under `gitnexus/hooks/codex/` that reuses the same GitNexus CLI behaviors where possible, but speaks Codex's input and output schema directly.

Why:

- Claude and Codex use different hook configuration files, event payloads, and supported response shapes
- Codex only exposes `Bash` for current `PreToolUse` and `PostToolUse` matching, so the existing Claude assumptions are incorrect for Codex
- isolating the Codex adapter keeps platform-specific logic explicit and easier to test

Alternatives considered:

- Reuse the Claude script with conditional branches: rejected because it would mix two incompatible wire formats into one brittle script.
- Skip a hook script and inline shell one-liners into `hooks.json`: rejected because the GitNexus behavior is non-trivial and already proven as script logic.

### 3. Scope the initial Codex integration to supported Bash-driven behaviors

The initial Codex hook integration should register only behaviors that Codex currently supports and that provide concrete value:

- Bash-scoped hook matching only
- stale-index reminders after successful git mutations
- optional GitNexus context feedback for Bash search commands when the command pattern can be extracted safely

Why:

- Codex currently does not expose Grep or Glob hook interception, so Claude's wider matcher set cannot be copied over
- Post-tool additional context is the most reliable current path for GitNexus guidance in Codex
- keeping the first release narrow reduces the risk of shipping hook registrations that never fire or fail open in confusing ways

Alternatives considered:

- Register `Grep|Glob|Bash` matchers for parity with Claude: rejected because current Codex docs state `PreToolUse` and `PostToolUse` only emit `Bash`
- Claim full parity in docs while implementing only partial support: rejected because it would set incorrect user expectations

### 4. Merge feature-flag and hook config without overwriting unrelated user settings

Setup should add `codex_hooks = true` under the existing Codex feature config and merge GitNexus hook groups into `hooks.json`, preserving unrelated MCP servers, features, and other user hooks.

Why:

- users may already have Codex config and custom hooks
- GitNexus setup should be additive and idempotent
- preserving existing config matches the current behavior for MCP registration in other editors

Alternatives considered:

- Rewrite `config.toml` and `hooks.json` from scratch: rejected because it would destroy user-owned Codex configuration

## Risks / Trade-offs

- Codex hooks are experimental and may change shape quickly -> Mitigation: keep Codex logic isolated, test around documented constraints, and document the support level as partial.
- Codex hook coverage is materially narrower than Claude's -> Mitigation: scope the implementation and docs to Bash-only behavior and avoid parity claims the runtime cannot honor.
- Multiple matching Codex hooks run concurrently -> Mitigation: make GitNexus hook behavior self-contained and avoid assuming it can suppress other hooks from starting.
- Windows support is unavailable today -> Mitigation: skip or clearly report unsupported installation paths rather than writing dead config.

## Migration Plan

1. Extend Codex setup helpers so `config.toml` can enable `codex_hooks` while continuing to add the GitNexus MCP entry.
2. Add bundled Codex hook assets and merge GitNexus hook entries into `~/.codex/hooks.json`.
3. Update README and setup guidance to describe Codex hook support as experimental and Bash-scoped.
4. Add targeted tests for setup merging, unsupported-platform behavior, and Codex hook script output.

Rollback strategy:

- Remove the Codex hook installation path from setup.
- Delete the copied GitNexus Codex hook assets and hook entries from user config in a follow-up cleanup if needed.
- Keep Codex MCP and skills support unchanged.

## Open Questions

- Whether the first Codex release should register both `PreToolUse` and `PostToolUse`, or start with `PostToolUse` only if Bash search augmentation proves too noisy in practice.
- Whether future work should offer an opt-in repo-local hook writer for teams that do not want global Codex hooks.
