## Why

GitNexus already configures Codex MCP and Codex skills, but it does not install any Codex hooks. Official Codex hooks now exist behind the `codex_hooks` feature flag, so GitNexus should support the current hook model and stop treating Claude Code as the only hook-enabled integration.

## What Changes

- Add Codex hook setup to `gitnexus setup`, including the required Codex feature flag and merged GitNexus hook registrations.
- Bundle a Codex-specific GitNexus hook script and configuration that follow the current Codex hook schema instead of Claude Code's hook schema.
- Support Codex hook behaviors that are actually available today, especially Bash-scoped GitNexus feedback and stale-index reminders after git mutations.
- Update docs, support matrices, and tests so Codex hook support and its current limitations are explicit.

## Capabilities

### New Capabilities
- `codex-hook-support`: GitNexus can install and document Codex hooks using the current Codex hook model, including Bash-scoped GitNexus feedback for indexed repositories.

### Modified Capabilities

## Impact

- Affected code: `gitnexus/src/cli/setup.ts`, new `gitnexus/hooks/codex/**` assets, README/setup guidance, and hook/setup tests.
- Affected user workflows: `gitnexus setup`, Codex startup/configuration, and Codex sessions that work inside indexed repositories.
- Platform constraints: Codex hooks are experimental, currently limited to supported Codex runtimes, and do not provide Claude-level Grep/Glob interception.
- Dependencies: no new third-party dependencies expected.
