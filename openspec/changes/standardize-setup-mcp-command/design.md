## Context

`gitnexus setup` configures MCP entries for multiple agent clients. Today the setup command resolves the local `gitnexus` executable with `which`/`where` and passes that resolved path into MCP writers. Some clients therefore receive absolute commands such as `/usr/local/bin/gitnexus`, while OpenCode receives an array command containing the same absolute path. Tests also preserve a package-manager fallback shape for OpenCode when the executable is not found.

The desired contract is simpler: any MCP config created or updated by `gitnexus setup` should invoke the server as `gitnexus mcp`. This makes generated config stable across binary moves, easier to read, and consistent across clients.

## Goals / Non-Goals

**Goals:**
- Centralize setup MCP command construction around literal `gitnexus` plus `mcp`.
- Apply the same command contract to Cursor, Claude Code, OpenCode, Codex, Gemini CLI, and any setup-managed MCP writer.
- Remove absolute path and `npx` fallback output from setup-generated MCP config.
- Update tests so the normalized command is enforced for JSON, JSONC, and TOML-backed clients.
- Preserve existing unrelated config, comments, indentation, hook setup, skill installation, and OpenCode plugin installation behavior.

**Non-Goals:**
- Change runtime behavior of the `gitnexus mcp` command itself.
- Change OpenCode plugin augmentation or stale-index reminder logic.
- Rework editor detection beyond what is needed to avoid command path persistence.
- Add shell-specific PATH bootstrapping for GUI-launched editors.

## Decisions

### Use a literal setup MCP command

Setup MCP helpers should return `gitnexus` as the command value and `mcp` as the sole MCP argument. For clients with command/args shape this means `{ command: 'gitnexus', args: ['mcp'] }`. For OpenCode this means `{ type: 'local', command: ['gitnexus', 'mcp'], enabled: true }`. For TOML-backed clients this means `command = "gitnexus"` and `args = ["mcp"]`.

**Rationale:**
- Matches the explicit user requirement that setup MCP entries should only use `gitnexus mcp`.
- Removes machine-specific install paths from durable config.
- Keeps all client writers aligned through one command contract.

**Alternatives considered:**
- Keep absolute paths for GUI reliability: rejected because it violates desired config shape and can become stale after reinstall or binary relocation.
- Use `npx -y gitnexus@latest mcp` when `gitnexus` is missing: rejected because setup-generated MCP config must remain `gitnexus mcp` only.

### Separate command validation from config generation

Executable detection may still be useful for setup preflight or warning messages, but detection results must not change the MCP entry written to client config.

**Rationale:**
- Allows setup to tell users when `gitnexus` is not resolvable without silently writing a different command.
- Keeps generated config deterministic and testable.

**Alternatives considered:**
- Remove executable detection entirely: simpler, but may reduce setup diagnostics for users whose PATH cannot resolve `gitnexus`.

### Keep non-MCP assets unchanged

OpenCode skills, OpenCode plugin installation, Claude/Codex/Gemini hooks, and other non-MCP setup assets should keep their existing behavior unless a test update is required due to output messaging.

**Rationale:**
- The requested change is scoped to setup-generated MCP commands.
- The OpenCode plugin currently resolves and runs the bundled CLI for `augment` behavior; changing that would expand risk beyond MCP setup.

**Alternatives considered:**
- Standardize every GitNexus invocation in setup-related assets to `gitnexus`: rejected as broader than the MCP-only requirement and likely to affect plugin reliability.

## Risks / Trade-offs

- **GUI-launched editors may not inherit a PATH containing `gitnexus`** → Setup output should make the PATH dependency clear if detection fails or if docs are updated.
- **Tests may hide old fallback assumptions** → Update all setup tests that assert `/usr/local/bin/gitnexus`, `npx`, or other non-literal command shapes.
- **Client config formats differ** → Keep per-client serializers, but make them consume the same normalized MCP command contract.
- **Existing users have absolute paths already written** → Rerunning `gitnexus setup` should overwrite the GitNexus MCP entry while preserving unrelated config.

## Migration Plan

1. Update setup MCP entry helpers so all generated entries use `gitnexus mcp`.
2. Adjust any preflight handling so missing binary detection does not produce `npx` fallback config.
3. Update tests for Cursor, Claude Code, OpenCode, Codex, Gemini CLI, and repeated setup idempotency.
4. Update documentation or setup output if it currently promises absolute-path reliability.
5. Existing users migrate by rerunning `gitnexus setup`; rollback is rerunning an older setup version or manually changing the MCP command back to an absolute path.

## Open Questions

- Should setup warn but continue when `gitnexus` is not currently resolvable on PATH?
- Should docs include a troubleshooting note for GUI editors whose PATH does not include the `gitnexus` command?
