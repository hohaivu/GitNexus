## ADDED Requirements

### Requirement: Setup installs Codex hook prerequisites
`gitnexus setup` SHALL install the configuration required for GitNexus Codex hooks when Codex is present on a supported platform.

#### Scenario: Setup enables Codex hook support
- **WHEN** `gitnexus setup` runs on a machine with Codex installed and Codex hooks are supported for that runtime
- **THEN** setup MUST ensure Codex hook support is enabled in `~/.codex/config.toml`
- **THEN** setup MUST merge GitNexus hook registrations into `~/.codex/hooks.json`
- **THEN** setup MUST install or copy the GitNexus Codex hook script to a stable path referenced by those registrations

#### Scenario: Setup preserves unrelated Codex configuration
- **WHEN** `gitnexus setup` adds GitNexus Codex hook support for a user who already has Codex config or other Codex hooks
- **THEN** setup MUST preserve unrelated Codex MCP entries, feature flags, and non-GitNexus hook registrations
- **THEN** repeated setup runs MUST remain idempotent for GitNexus-owned Codex hook entries

### Requirement: GitNexus Codex hooks respect current Codex runtime limits
GitNexus-installed Codex hooks SHALL only register event matchers and behaviors that the current Codex hook runtime supports.

#### Scenario: Bash-only hook registration
- **WHEN** GitNexus writes Codex `PreToolUse` or `PostToolUse` hook registrations
- **THEN** those registrations MUST use `Bash` matching rather than Claude-specific `Grep` or `Glob` matchers
- **THEN** the installed hook behavior MUST NOT claim non-Bash interception that current Codex does not provide

#### Scenario: Unsupported platform handling
- **WHEN** `gitnexus setup` runs in an environment where Codex hooks are not currently supported
- **THEN** setup MUST NOT write GitNexus Codex hook registrations that cannot execute
- **THEN** setup MUST report Codex hook support as skipped or unsupported rather than silently claiming success

### Requirement: Codex hooks surface GitNexus feedback for indexed repositories
GitNexus-installed Codex hooks SHALL surface GitNexus-specific feedback only for sessions whose working directory belongs to a repository with a `.gitnexus` index.

#### Scenario: Bash search command receives GitNexus context
- **WHEN** a supported Codex Bash hook runs for a Bash search command inside a repository that contains a `.gitnexus` index
- **THEN** the hook MUST attempt to derive a search pattern and query GitNexus augmentation for that pattern
- **THEN** the hook MUST emit any returned GitNexus context using a Codex-supported hook response shape

#### Scenario: Git mutation marks the index stale
- **WHEN** a supported Codex Bash hook observes a successful git mutation command in a repository that contains a `.gitnexus` index
- **THEN** the hook MUST compare the current git state with the last indexed state
- **THEN** the hook MUST notify Codex when the GitNexus index is stale
- **THEN** the notification MUST preserve the `--embeddings` recommendation when the existing index metadata shows embeddings were previously generated

#### Scenario: Non-indexed repository remains silent
- **WHEN** a supported Codex Bash hook runs outside a repository that contains a `.gitnexus` index
- **THEN** the hook MUST exit without GitNexus feedback
