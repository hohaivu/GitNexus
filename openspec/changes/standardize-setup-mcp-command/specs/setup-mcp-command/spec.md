## ADDED Requirements

### Requirement: Setup uses literal GitNexus MCP command
`gitnexus setup` SHALL configure every setup-managed MCP client to invoke the GitNexus MCP server as `gitnexus mcp` rather than using an absolute executable path or package-manager fallback command.

#### Scenario: Command and args MCP clients
- **WHEN** setup writes or updates an MCP client that stores server command and arguments separately
- **THEN** the GitNexus MCP entry command SHALL be `gitnexus` and its arguments SHALL be `["mcp"]`

#### Scenario: Array command MCP clients
- **WHEN** setup writes or updates an MCP client that stores the full local command as an array
- **THEN** the GitNexus MCP entry command SHALL be `["gitnexus", "mcp"]`

#### Scenario: TOML MCP clients
- **WHEN** setup writes or updates a TOML-backed MCP client configuration
- **THEN** the GitNexus MCP entry SHALL use `command = "gitnexus"` and `args = ["mcp"]`

### Requirement: Setup does not persist resolved binary paths
`gitnexus setup` SHALL NOT persist the result of executable discovery, such as `/usr/local/bin/gitnexus`, into setup-managed MCP configuration.

#### Scenario: GitNexus executable discovered on PATH
- **WHEN** setup discovers a resolved `gitnexus` executable path during preflight
- **THEN** generated MCP entries SHALL still use the literal command `gitnexus` instead of the discovered path

### Requirement: Setup does not persist package-manager fallback MCP commands
`gitnexus setup` SHALL NOT write package-manager fallback commands such as `npx -y gitnexus@latest mcp` into setup-managed MCP configuration.

#### Scenario: GitNexus executable not discovered on PATH
- **WHEN** setup cannot discover a `gitnexus` executable path
- **THEN** setup SHALL NOT generate an `npx`, `npm`, `yarn`, `pnpm`, or equivalent fallback MCP command for the GitNexus MCP entry

### Requirement: Setup preserves unrelated client configuration
`gitnexus setup` SHALL preserve unrelated client configuration while normalizing the GitNexus MCP entry command.

#### Scenario: Existing config contains unrelated settings
- **WHEN** setup updates an existing client config containing non-GitNexus settings or other MCP servers
- **THEN** those unrelated settings SHALL remain unchanged while the GitNexus MCP entry is written as `gitnexus mcp`
