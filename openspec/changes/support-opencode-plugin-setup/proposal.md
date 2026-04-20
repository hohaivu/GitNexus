## Why

OpenCode does not expose the hook mechanism GitNexus uses in Claude Code, Codex, and Gemini CLI to provide pre-search graph augmentation and post-git stale-index reminders. GitNexus already configures OpenCode MCP and skills, so adding first-class plugin setup closes the behavioral gap and gives OpenCode users comparable guidance and safety during agent sessions.

## What Changes

- Add a first-party OpenCode plugin installation path to `gitnexus setup`.
- Package and install a GitNexus OpenCode plugin into the user’s OpenCode plugin directory.
- Configure OpenCode so the plugin is discovered alongside the existing GitNexus MCP server and skills.
- Define plugin behavior that mirrors current hook-based integrations where feasible:
  - enrich search-oriented tool usage with GitNexus graph context before execution
  - notify users when git mutations make the local GitNexus index stale
- Update setup output, tests, and documentation to describe OpenCode plugin support and expected behavior.

## Capabilities

### New Capabilities
- `opencode-plugin-setup`: Install and configure a GitNexus OpenCode plugin that provides Claude-hook-like GitNexus integration behavior inside OpenCode.

### Modified Capabilities
- None.

## Impact

- Affected code: `gitnexus/src/cli/setup.ts`, CLI packaging assets, new OpenCode plugin source/assets, setup tests, and user-facing docs.
- Affected systems: OpenCode global config and plugin directories under `~/.config/opencode/`.
- External dependencies: OpenCode plugin API/events and config conventions.
- User impact: OpenCode users gain a setup path that goes beyond MCP-only integration and enables GitNexus session assistance comparable to hook-enabled clients.
