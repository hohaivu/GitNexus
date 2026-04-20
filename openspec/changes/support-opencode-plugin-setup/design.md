## Context

GitNexus already installs agent-specific integration assets for Claude Code, Codex, and Gemini CLI, using hook scripts to provide two high-value behaviors during agent sessions: pre-search graph augmentation and post-git stale-index reminders. OpenCode is different: it supports MCP servers, skills, and plugins, but does not expose the same hook contract. The current `gitnexus setup` flow only configures OpenCode MCP and skills, leaving OpenCode users without behavior comparable to hook-enabled clients.

OpenCode plugins are loaded from `~/.config/opencode/plugins/` or `.opencode/plugins/` and can subscribe to events such as `tool.execute.before` and `tool.execute.after`. Those events are the closest OpenCode-native equivalent to the existing hook lifecycle and allow GitNexus to provide similar integration behavior without requiring OpenCode to add a hook API.

## Goals / Non-Goals

**Goals:**
- Install a first-party GitNexus OpenCode plugin as part of `gitnexus setup` when OpenCode is present.
- Use OpenCode plugin events to deliver behavior equivalent to current GitNexus hook integrations where possible.
- Keep setup idempotent and preserve unrelated user OpenCode config.
- Document the distinction between OpenCode MCP setup, skill installation, and plugin installation.
- Verify the new flow through setup-focused automated tests.

**Non-Goals:**
- Introduce brand new GitNexus behaviors beyond current hook parity.
- Require project-local `.opencode/` setup; the initial path targets global user installation.
- Redesign existing Claude/Codex/Gemini hook systems as part of this change.
- Automatically reindex GitNexus after git mutations; the plugin only warns about stale state.

## Decisions

### Install a bundled local OpenCode plugin instead of relying on npm plugin packages
GitNexus should ship a first-party plugin asset with the CLI package and copy it into `~/.config/opencode/plugins/` during setup. This matches how hook-enabled integrations already install bundled assets and avoids introducing an npm package distribution story for the plugin.

**Rationale:**
- Keeps `gitnexus setup` self-contained.
- Avoids requiring Bun package resolution for a GitNexus-owned plugin package name.
- Gives GitNexus full control over installed plugin contents and upgrade behavior.

**Alternatives considered:**
- Publish an npm OpenCode plugin package and add it to `opencode.json`: simpler config, but adds package lifecycle and version coordination overhead.
- Ask users to manually copy a plugin file: lower implementation work, but inconsistent with the goal of setup automation.

### Model OpenCode integration as a plugin adapter for existing GitNexus behaviors
The OpenCode plugin should implement the same two core behaviors as Claude hooks: search augmentation before relevant tool execution and stale-index warning after successful git mutations.

**Rationale:**
- Keeps the user-facing value proposition consistent across agent clients.
- Frames OpenCode as another integration transport rather than a separate feature set.
- Reduces scope creep while OpenCode support matures.

**Alternatives considered:**
- Build an OpenCode-only feature set: more native, but breaks parity and increases design scope.
- Skip search augmentation and only warn on stale index: smaller change, but leaves the main hook value missing.

### Use OpenCode-native plugin events rather than trying to emulate Claude’s hook I/O contract directly
The plugin should subscribe to OpenCode events such as `tool.execute.before` and `tool.execute.after`, inspect the tool/input, and use supported OpenCode output channels to surface GitNexus context or warnings.

**Rationale:**
- Claude’s `hookSpecificOutput.additionalContext` protocol is client-specific.
- OpenCode plugins can mutate tool flow and surface UI/events using their own primitives.
- Preserves compatibility with OpenCode’s documented extension model.

**Alternatives considered:**
- Shell out to the Claude hook script from an OpenCode plugin: faster to prototype, but tightly couples OpenCode behavior to Claude-specific assumptions.

### Extend setup reporting and tests to treat OpenCode plugin installation as a first-class result
`gitnexus setup` should report OpenCode MCP, skills, and plugin installation separately enough for users and tests to verify what happened.

**Rationale:**
- OpenCode support now spans multiple primitives with different failure modes.
- Clear reporting helps users understand partial success and diagnose setup issues.

**Alternatives considered:**
- Continue reporting a single generic “OpenCode” success line: simpler, but obscures whether plugin installation actually happened.

## Risks / Trade-offs

- **[OpenCode event model differs from hook timing]** → Validate that `tool.execute.before` and `tool.execute.after` provide enough context to reproduce current behaviors before implementation is finalized.
- **[Plugin UX may not match Claude’s additionalContext exactly]** → Choose the closest OpenCode-native mechanism and document behavior as “hook-like parity” rather than byte-for-byte equivalence.
- **[Config/path drift between docs and code]** → Normalize setup and documentation to OpenCode’s documented config and directory conventions as part of the change.
- **[Behavior duplication across integrations]** → Keep the plugin narrowly scoped to existing behaviors and prefer shared utility logic if practical during implementation.
- **[Partial setup failures could confuse users]** → Preserve per-component setup summary output and surface plugin-specific errors separately.

## Migration Plan

1. Add the bundled OpenCode plugin asset and package it with the CLI.
2. Extend `gitnexus setup` to install the plugin into the global OpenCode plugin directory and ensure OpenCode config remains compatible with existing MCP setup.
3. Update tests and documentation to cover plugin installation and behavior expectations.
4. Existing users can rerun `gitnexus setup` to receive the plugin without needing to recreate their OpenCode configuration.
5. Rollback consists of removing the installed plugin asset and reverting the setup/docs changes; existing MCP and skill setup can remain intact.

## Open Questions

- Which OpenCode output mechanism is best for surfacing search augmentation context: tool mutation, prompt append, toast, or a combination?
- Should the plugin be installed only globally, or should the design leave room for later project-local installation support?
- Should OpenCode skill installation be normalized from `skill/` to `skills/` in the same change if current behavior relies on a compatibility alias?
