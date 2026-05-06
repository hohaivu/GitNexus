## 1. MCP Command Construction

- [x] 1.1 Update shared MCP entry construction so command/args clients receive `command: "gitnexus"` and `args: ["mcp"]`.
- [x] 1.2 Update OpenCode MCP entry construction so array-command config receives `command: ["gitnexus", "mcp"]` with `type: "local"` and `enabled: true`.
- [x] 1.3 Update TOML MCP config generation so Codex-style entries use `command = "gitnexus"` and `args = ["mcp"]`.
- [x] 1.4 Ensure executable discovery results are not passed into MCP entry values or used to generate package-manager fallback MCP commands.

## 2. Setup Behavior Preservation

- [x] 2.1 Verify setup still creates or updates Cursor, Claude Code, OpenCode, Codex, and Gemini CLI MCP configs when their install directories exist.
- [x] 2.2 Verify setup still preserves unrelated JSON/JSONC/TOML settings, comments, and indentation when normalizing the GitNexus MCP entry.
- [x] 2.3 Verify OpenCode skills, OpenCode plugin installation, and existing hook installations remain unchanged by the MCP command normalization.
- [x] 2.4 Decide and implement setup reporting for cases where `gitnexus` is not found on PATH without writing fallback MCP commands.

## 3. Tests and Documentation

- [x] 3.1 Update unit tests that currently expect `/usr/local/bin/gitnexus` or other resolved paths in setup-generated MCP config.
- [x] 3.2 Update tests that currently expect `npx -y gitnexus@latest mcp` fallback output so they assert no package-manager fallback is persisted.
- [x] 3.3 Add or update coverage for each supported MCP config format: command/args JSON, OpenCode array JSON, and TOML.
- [x] 3.4 Update user-facing docs or setup text that describes MCP command generation or absolute-path behavior.

## 4. Verification

- [x] 4.1 Run targeted setup tests for JSONC preservation, skill/plugin setup, and MCP config generation.
- [x] 4.2 Run broader relevant test suite or project test command to catch regressions.
- [x] 4.3 Manually inspect generated fixture/temp config output, if needed, to confirm every setup-managed MCP entry invokes `gitnexus mcp`.
