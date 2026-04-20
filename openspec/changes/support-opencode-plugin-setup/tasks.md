## 1. Package and install the OpenCode plugin

- [x] 1.1 Add a first-party OpenCode plugin asset to the GitNexus package and ensure it is included in published CLI artifacts.
- [x] 1.2 Extend `gitnexus/src/cli/setup.ts` to install the plugin into OpenCode's global plugin directory when OpenCode is present.
- [x] 1.3 Keep OpenCode setup idempotent by updating only GitNexus-managed plugin/config state and preserving unrelated user configuration.

## 2. Implement hook-parity plugin behavior

- [x] 2.1 Implement OpenCode plugin handling for supported search-oriented tool events that invokes GitNexus augmentation logic.
- [x] 2.2 Implement OpenCode plugin handling for successful git mutation events that warns when the local GitNexus index is stale.
- [x] 2.3 Choose and wire the OpenCode-native output mechanism(s) used to surface augmentation context and stale-index warnings.

## 3. Verify setup flow and document the integration

- [x] 3.1 Add or update setup-focused automated tests covering OpenCode plugin installation, idempotency, and summary output.
- [x] 3.2 Update README/setup documentation to describe OpenCode MCP setup, skill installation, and plugin installation distinctly.
- [x] 3.3 Validate that rerunning `gitnexus setup` upgrades existing OpenCode users without breaking prior MCP or skill configuration.
