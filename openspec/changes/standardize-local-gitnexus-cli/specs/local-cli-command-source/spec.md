## ADDED Requirements

### Requirement: Generated agent instructions use local GitNexus commands
GitNexus SHALL generate agent-facing instructions that use the local `gitnexus` command source instead of `npx gitnexus`. This applies to generated repository context such as `AGENTS.md`, `CLAUDE.md`, and MCP setup/help resources.

#### Scenario: Analyze generates stable local commands
- **WHEN** `gitnexus analyze` generates or refreshes repository AI context files
- **THEN** the generated command examples MUST use `gitnexus ...`
- **THEN** the generated command examples MUST NOT contain `npx gitnexus` or `npx -y gitnexus@latest`

#### Scenario: MCP setup resource recommends local analyze command
- **WHEN** an MCP setup/help resource tells the user how to initialize or refresh an index
- **THEN** it MUST recommend `gitnexus analyze`
- **THEN** it MUST NOT recommend `npx gitnexus analyze`

### Requirement: Setup-generated integrations invoke the local executable
`gitnexus setup` SHALL configure machine-written MCP and hook integrations to invoke the local GitNexus executable instead of `npx`.

#### Scenario: Local executable is resolvable during setup
- **WHEN** `gitnexus setup` can resolve the installed GitNexus executable
- **THEN** it MUST write MCP and hook command entries that invoke the resolved local executable
- **THEN** the written entries MUST NOT contain `npx`, `npx -y`, or `gitnexus@latest`

#### Scenario: Local executable is missing during setup
- **WHEN** `gitnexus setup` cannot resolve a local GitNexus executable required for a machine-written integration
- **THEN** setup MUST fail with an actionable message that a local/global `gitnexus` install is required
- **THEN** setup MUST NOT silently write an `npx`-based fallback command

### Requirement: Bundled agent assets default to local GitNexus commands
Bundled skills, hooks, plugin integration assets, and setup/onboarding examples shipped with the repository SHALL use `gitnexus` as the default command source.

#### Scenario: Bundled skills and hooks reference refresh commands
- **WHEN** a bundled skill or hook tells an agent or user to refresh or query GitNexus
- **THEN** it MUST reference `gitnexus` commands
- **THEN** it MUST NOT reference `npx gitnexus`

#### Scenario: Manual setup examples reference MCP invocation
- **WHEN** repository docs or static integration assets show manual MCP setup examples
- **THEN** the examples MUST invoke `gitnexus mcp` or a locally resolved GitNexus executable
- **THEN** the examples MUST NOT use `npx -y gitnexus@latest mcp`
