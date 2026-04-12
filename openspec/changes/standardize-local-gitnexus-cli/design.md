## Context

GitNexus currently mixes two execution models in agent-facing surfaces:

- generated content such as `AGENTS.md`, `CLAUDE.md`, and MCP resources often tells users and agents to run `npx gitnexus ...`
- setup-generated machine config in `setup.ts` already prefers a discovered `gitnexus` binary, but still preserves `npx` fallback behavior
- bundled skills, hooks, docs, and integration assets still encode `npx` commands in many places

For a maintained fork with a globally installed `gitnexus` binary, this inconsistency creates real workflow risk. Agents copy commands from generated context, hooks invoke unstable command sources, and `npx` can silently pull a different version than the one the user intends to run.

The target environment for this change is a user-managed global GitNexus installation. The design should optimize for version stability and predictable behavior, not zero-install convenience.

## Goals / Non-Goals

**Goals:**

- Make `gitnexus` the default command contract across generated agent instructions, setup-generated integrations, and bundled agent assets.
- Ensure machine-written MCP and hook config use the local GitNexus executable in a way that is stable across shell and GUI-launched environments.
- Remove silent fallback paths that reintroduce `npx` behavior after setup.
- Make the local-binary policy explicit in tests and user-facing setup guidance.

**Non-Goals:**

- Preserving first-run `npx` convenience for users who do not install GitNexus locally.
- Redesigning unrelated onboarding, indexing, or MCP feature behavior.
- Introducing a multi-mode command policy toggle in this change.

## Decisions

### 1. Standardize human-facing and generated agent commands on `gitnexus`

Generated AI context, setup guidance, MCP resources, bundled skills, and manual examples will use `gitnexus ...` rather than `npx gitnexus ...`.

Why:

- agent behavior is heavily influenced by the commands present in generated context and bundled skills
- mixed examples would keep reintroducing the unstable path even if machine config is fixed

Alternatives considered:

- Keep `npx` in docs as an alternate path: rejected because agents and users frequently copy the first command they see.
- Keep mixed wording by surface: rejected because it preserves ambiguity instead of defining one supported contract.

### 2. Machine-written config should resolve and persist the local executable path

Where GitNexus writes MCP or hook command entries programmatically, it should resolve the installed `gitnexus` executable and write the absolute path when resolution succeeds.

Why:

- absolute paths are more reliable than a bare `gitnexus` command in GUI-launched editor environments with incomplete `PATH`
- the user wants version control through a specific installed binary, not shell-time command discovery

Alternatives considered:

- Write plain `gitnexus` everywhere: rejected for lower reliability in editor-launched subprocesses.
- Keep `npx` fallback in machine config: rejected because it defeats the stability goal when local resolution fails.

### 3. Missing local binary should fail clearly, not silently downgrade to `npx`

If setup cannot resolve a local GitNexus executable for a machine-written integration, it should fail with an actionable message explaining that a local/global install is required.

Why:

- silent fallback hides configuration drift
- explicit failure is easier to diagnose than background `npx` execution using a different version

Alternatives considered:

- Continue silent `npx` fallback: rejected because it recreates the exact workflow instability this change is meant to remove.

### 4. Use one command-source policy across code and packaged assets

Implementation should centralize the command-source policy in reusable helpers where code is generated dynamically, and update static package assets to match the same local-command rule.

Why:

- command strings are currently duplicated across `ai-context.ts`, `setup.ts`, hooks, skills, plugin assets, and docs
- a single policy reduces drift and makes tests easier to target

Alternatives considered:

- Ad hoc string replacement file-by-file: rejected because drift would likely return over time.

## Risks / Trade-offs

- Local install becomes mandatory for supported setup flows → Mitigation: setup and docs must fail or instruct clearly when `gitnexus` is not installed.
- Static packaged assets may still rely on shell `PATH` if they cannot embed an absolute path → Mitigation: reserve absolute-path persistence for machine-written setup config and keep static assets consistent on `gitnexus`.
- Broad surface area increases regression risk → Mitigation: add search-based coverage in tests and update representative integration tests for setup, hooks, and generated content.

## Migration Plan

1. Update generated-content sources and setup command policy in the CLI package.
2. Update bundled hooks, skills, and static integration assets to remove `npx` usage.
3. Update docs and onboarding examples to reflect the local-binary workflow.
4. Update or add tests that assert generated outputs and written configs no longer contain `npx gitnexus`.

Rollback strategy:

- Revert the command-source policy changes in the affected files.
- Re-run setup in affected environments to restore prior config if needed.

## Open Questions

- Whether any published plugin asset still needs an explicitly documented unsupported `npx` recovery path in migration notes. The default implementation path should assume the local install is required.
