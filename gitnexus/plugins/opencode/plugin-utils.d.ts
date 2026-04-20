export function extractSearchPattern(toolName: string, args: Record<string, any>): string | null;
export function isSuccessfulToolExecution(input: any, output: any): boolean;
export function findGitNexusDir(startDir?: string): string | null;
export function resolveCliPath(): string;
export function createGitNexusOpenCodePlugin(options?: {
  spawnSyncImpl?: typeof import('child_process').spawnSync;
  cliPathResolver?: () => string;
}): any;
