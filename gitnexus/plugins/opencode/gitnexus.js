import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEARCH_TOOL_NAMES = new Set(['grep', 'glob', 'bash']);
const GIT_MUTATION_COMMAND = /\bgit\s+(commit|merge|rebase|cherry-pick|pull)(\s|$)/;
const PLACEHOLDER_CLI_PATH = '__GITNEXUS_CLI_PATH__';

function normalizeToolName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeArgs(value) {
  if (!value || typeof value !== 'object') return {};
  return value;
}

function getToolArgs(input, output) {
  const outputArgs = normalizeArgs(output?.args);
  if (Object.keys(outputArgs).length > 0) return outputArgs;

  const inputArgs = normalizeArgs(input?.args);
  if (Object.keys(inputArgs).length > 0) return inputArgs;

  const toolInput = normalizeArgs(input?.tool_input);
  if (Object.keys(toolInput).length > 0) return toolInput;

  return {};
}

function extractBashSearchPattern(command) {
  if (!/\brg\b|\bgrep\b/.test(command)) return null;

  const tokens = command.split(/\s+/);
  let foundCmd = false;
  let skipNext = false;
  const flagsWithValues = new Set([
    '-e',
    '-f',
    '-m',
    '-A',
    '-B',
    '-C',
    '-g',
    '--glob',
    '-t',
    '--type',
    '--include',
    '--exclude',
  ]);

  for (const token of tokens) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (!foundCmd) {
      if (/\brg$|\bgrep$/.test(token)) foundCmd = true;
      continue;
    }
    if (token.startsWith('-')) {
      if (flagsWithValues.has(token)) skipNext = true;
      continue;
    }
    const cleaned = token.replace(/["']/g, '');
    return cleaned.length >= 3 ? cleaned : null;
  }

  return null;
}

function extractSearchPattern(toolName, args) {
  const normalizedTool = normalizeToolName(toolName);
  if (!SEARCH_TOOL_NAMES.has(normalizedTool)) return null;

  if (normalizedTool === 'grep') {
    return typeof args.pattern === 'string' && args.pattern.length >= 3 ? args.pattern : null;
  }

  if (normalizedTool === 'glob') {
    const raw = typeof args.pattern === 'string' ? args.pattern : '';
    const match = raw.match(/[*\/]([a-zA-Z][a-zA-Z0-9_-]{2,})/);
    return match ? match[1] : null;
  }

  return extractBashSearchPattern(typeof args.command === 'string' ? args.command : '');
}

function isSuccessfulToolExecution(input, output) {
  const exitCodeCandidates = [
    output?.exitCode,
    output?.exit_code,
    output?.result?.exitCode,
    output?.result?.exit_code,
    input?.tool_output?.exitCode,
    input?.tool_output?.exit_code,
    input?.result?.exitCode,
    input?.result?.exit_code,
  ];

  for (const candidate of exitCodeCandidates) {
    if (typeof candidate === 'number') return candidate === 0;
  }

  return true;
}

function findGitNexusDir(startDir) {
  let dir = startDir || process.cwd();
  for (let i = 0; i < 5; i += 1) {
    const candidate = path.join(dir, '.gitnexus');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function resolveBundledCliPath() {
  let cliPath = path.resolve(__dirname, '..', '..', 'dist', 'cli', 'index.js');
  if (fs.existsSync(cliPath)) return cliPath;

  const devCliPath = path.resolve(__dirname, '..', '..', 'src', 'cli', 'index.ts');
  if (fs.existsSync(devCliPath)) return devCliPath;

  return '';
}

function resolveCliPath() {
  if (PLACEHOLDER_CLI_PATH !== '__GITNEXUS_CLI_PATH__' && fs.existsSync(PLACEHOLDER_CLI_PATH)) {
    return PLACEHOLDER_CLI_PATH;
  }

  if (process.env.GITNEXUS_CLI_PATH && fs.existsSync(process.env.GITNEXUS_CLI_PATH)) {
    return process.env.GITNEXUS_CLI_PATH;
  }

  return resolveBundledCliPath();
}

function runGitNexusCli(cliPath, args, cwd, timeout, spawnSyncImpl) {
  const isWin = process.platform === 'win32';
  if (cliPath) {
    return spawnSyncImpl(process.execPath, [cliPath, ...args], {
      encoding: 'utf-8',
      timeout,
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  return spawnSyncImpl(isWin ? 'npx.cmd' : 'npx', ['-y', 'gitnexus', ...args], {
    encoding: 'utf-8',
    timeout: timeout + 5000,
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function readIndexMeta(gitNexusDir) {
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(gitNexusDir, 'meta.json'), 'utf-8'));
    return {
      lastCommit: meta.lastCommit || '',
      hadEmbeddings: Boolean(meta.stats && meta.stats.embeddings > 0),
    };
  } catch {
    return {
      lastCommit: '',
      hadEmbeddings: false,
    };
  }
}

async function safeLog(client, level, message, extra = {}) {
  try {
    await client?.app?.log?.({
      body: {
        service: 'gitnexus-opencode-plugin',
        level,
        message,
        extra,
      },
    });
  } catch {
    // ignore logging failures
  }
}

async function surfaceSearchContext(client, pattern, context) {
  await safeLog(client, 'info', 'GitNexus search context added', { pattern });

  try {
    await client?.tui?.appendPrompt?.({
      body: {
        text: `\n[GitNexus context for ${pattern}]\n${context}\n`,
      },
    });
  } catch {
    // ignore prompt append failures
  }

  try {
    await client?.tui?.showToast?.({
      body: {
        message: `GitNexus context added for ${pattern}`,
        variant: 'info',
      },
    });
  } catch {
    // ignore toast failures
  }
}

async function surfaceStaleWarning(client, message, extra = {}) {
  await safeLog(client, 'warn', message, extra);

  try {
    await client?.tui?.showToast?.({
      body: {
        message,
        variant: 'warning',
      },
    });
  } catch {
    // ignore toast failures
  }
}

function createGitNexusOpenCodePlugin(options = {}) {
  const spawnSyncImpl = options.spawnSyncImpl || spawnSync;
  const cliPathResolver = options.cliPathResolver || resolveCliPath;

  return async ({ client, directory, worktree }) => ({
    'tool.execute.before': async (input, output) => {
      const toolName = normalizeToolName(input?.tool || input?.tool_name);
      if (!SEARCH_TOOL_NAMES.has(toolName)) return;

      const args = getToolArgs(input, output);
      const pattern = extractSearchPattern(toolName, args);
      if (!pattern) return;

      const cwd = args.cwd || input?.cwd || worktree || directory || process.cwd();
      if (!path.isAbsolute(cwd)) return;

      const gitNexusDir = findGitNexusDir(cwd);
      if (!gitNexusDir) return;

      const cliPath = cliPathResolver();
      try {
        const child = runGitNexusCli(cliPath, ['augment', '--', pattern], cwd, 7000, spawnSyncImpl);
        const context =
          child && !child.error && child.status === 0 ? String(child.stderr || '').trim() : '';
        if (!context) return;
        await surfaceSearchContext(client, pattern, context);
      } catch {
        // never block tool execution
      }
    },

    'tool.execute.after': async (input, output) => {
      const toolName = normalizeToolName(input?.tool || input?.tool_name);
      if (toolName !== 'bash') return;

      const args = getToolArgs(input, output);
      const command = typeof args.command === 'string' ? args.command : '';
      if (!GIT_MUTATION_COMMAND.test(command)) return;
      if (!isSuccessfulToolExecution(input, output)) return;

      const cwd = args.cwd || input?.cwd || worktree || directory || process.cwd();
      if (!path.isAbsolute(cwd)) return;

      const gitNexusDir = findGitNexusDir(cwd);
      if (!gitNexusDir) return;

      let currentHead = '';
      try {
        const headResult = spawnSyncImpl('git', ['rev-parse', 'HEAD'], {
          encoding: 'utf-8',
          timeout: 3000,
          cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        currentHead = String(headResult?.stdout || '').trim();
      } catch {
        return;
      }

      if (!currentHead) return;

      const { lastCommit, hadEmbeddings } = readIndexMeta(gitNexusDir);
      if (currentHead === lastCommit) return;

      const analyzeCmd = `gitnexus analyze${hadEmbeddings ? ' --embeddings' : ''}`;
      const message = `GitNexus index is stale (last indexed: ${lastCommit ? lastCommit.slice(0, 7) : 'never'}). Run ${analyzeCmd} to update knowledge graph.`;
      await surfaceStaleWarning(client, message, {
        currentHead,
        lastCommit,
      });
    },
  });
}

export const GitNexusOpenCodePlugin = createGitNexusOpenCodePlugin();
export default GitNexusOpenCodePlugin;
