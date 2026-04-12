## 1. Command Policy Core

- [x] 1.1 Add or consolidate a shared local-command policy for GitNexus CLI invocation, including local executable resolution for machine-written integrations.
- [x] 1.2 Update `gitnexus/src/cli/setup.ts` to stop writing `npx` fallback MCP and hook commands and to fail clearly when a required local executable cannot be resolved.
- [x] 1.3 Update generated-content sources such as `gitnexus/src/cli/ai-context.ts` and `gitnexus/src/mcp/resources.ts` to emit `gitnexus` commands instead of `npx gitnexus`.

## 2. Bundled Assets And Docs

- [x] 2.1 Update bundled hooks, packaged skills, and static integration assets under the GitNexus packages to use local `gitnexus` commands.
- [x] 2.2 Update repository setup, onboarding, and manual MCP examples to describe the local-binary workflow consistently.
- [x] 2.3 Sweep the repository for remaining agent-facing or setup-facing `npx gitnexus` references and convert them or mark them as intentional exceptions.

## 3. Validation

- [x] 3.1 Update unit and integration tests that assert setup output, generated AI context, hook behavior, or packaged asset contents so they validate the local-command contract.
- [x] 3.2 Run targeted validation for the affected package surfaces and confirm the changed outputs no longer emit `npx gitnexus` in supported setup and agent workflows.
