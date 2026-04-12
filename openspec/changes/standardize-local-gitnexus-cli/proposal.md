## Why

GitNexus currently teaches agents and users to run many workflows through `npx gitnexus`, which makes command behavior depend on remote package resolution and whatever version npm serves at execution time. For a maintained fork and a user-controlled global install, this creates avoidable instability in setup, hooks, and generated agent instructions.

## What Changes

- Standardize generated agent-facing command examples to use `gitnexus` instead of `npx gitnexus`.
- Update setup-generated MCP and hook integrations to use the locally installed GitNexus executable instead of writing `npx`-based commands.
- Align bundled skills, integration assets, and setup/onboarding documentation with the local-binary workflow.
- Update automated tests to validate the local-command contract and prevent regressions back to `npx`.

## Capabilities

### New Capabilities
- `local-cli-command-source`: GitNexus-generated setup content and bundled agent assets use a stable local GitNexus CLI command source that the user controls.

### Modified Capabilities

## Impact

- Affected code: `gitnexus/src/cli/ai-context.ts`, `gitnexus/src/cli/setup.ts`, `gitnexus/src/mcp/resources.ts`, `gitnexus/hooks/**`, packaged skills, plugin integration assets, and related tests.
- Affected user workflows: `gitnexus analyze`, `gitnexus setup`, generated `AGENTS.md` / `CLAUDE.md`, hook-installed refresh guidance, and manual MCP setup guidance.
- Dependencies: no new third-party dependencies expected.
