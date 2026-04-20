## ADDED Requirements

### Requirement: GitNexus SHALL install an OpenCode plugin during setup
When OpenCode is installed on the user system, `gitnexus setup` SHALL install a first-party GitNexus plugin into OpenCode's plugin discovery path in addition to configuring the GitNexus MCP server.

#### Scenario: OpenCode is installed
- **WHEN** a user runs `gitnexus setup` on a machine with OpenCode installed
- **THEN** GitNexus installs its OpenCode plugin into the configured global OpenCode plugins directory
- **AND** the setup summary reports OpenCode plugin installation as a configured result

#### Scenario: OpenCode is not installed
- **WHEN** a user runs `gitnexus setup` on a machine without an OpenCode config directory
- **THEN** GitNexus SHALL skip OpenCode plugin installation without failing the entire setup command

### Requirement: The installed OpenCode plugin SHALL provide search augmentation behavior
The GitNexus OpenCode plugin SHALL intercept supported search-oriented tool executions and provide GitNexus graph context before execution using OpenCode's supported plugin event model.

#### Scenario: Supported search tool invocation
- **WHEN** an OpenCode session invokes a supported search-oriented tool with a resolvable search pattern inside a repository containing a GitNexus index
- **THEN** the plugin SHALL call GitNexus augmentation logic for that pattern
- **AND** SHALL surface the resulting context through an OpenCode-supported mechanism before the tool execution completes

#### Scenario: Non-search tool invocation
- **WHEN** an OpenCode session invokes a tool that is not eligible for GitNexus search augmentation
- **THEN** the plugin SHALL leave the tool execution unchanged

### Requirement: The installed OpenCode plugin SHALL warn when git mutations stale the index
The GitNexus OpenCode plugin SHALL detect successful git mutation commands that can stale the local GitNexus index and SHALL notify the user or session that reindexing is needed.

#### Scenario: Successful git mutation after indexing
- **WHEN** an OpenCode session successfully runs a git command that changes repository history or indexed state in a repository with a GitNexus index
- **THEN** the plugin SHALL compare the current repository HEAD to the last indexed commit metadata
- **AND** SHALL surface a warning that the GitNexus index is stale when they differ

#### Scenario: Failed git mutation
- **WHEN** an OpenCode session runs a git mutation command that fails
- **THEN** the plugin SHALL NOT emit a stale-index warning for that failed command

### Requirement: OpenCode setup SHALL remain idempotent and preserve unrelated user configuration
Repeated runs of `gitnexus setup` SHALL avoid duplicating GitNexus OpenCode configuration or plugin assets and SHALL preserve unrelated OpenCode settings.

#### Scenario: Re-running setup
- **WHEN** a user runs `gitnexus setup` multiple times on the same OpenCode installation
- **THEN** GitNexus SHALL keep a single effective GitNexus OpenCode plugin installation
- **AND** SHALL preserve unrelated OpenCode configuration values

#### Scenario: Existing OpenCode configuration
- **WHEN** a user already has custom OpenCode MCP, plugin, or other config entries
- **THEN** GitNexus SHALL add or update only its own required configuration and installation artifacts
- **AND** SHALL NOT remove unrelated user-managed entries
