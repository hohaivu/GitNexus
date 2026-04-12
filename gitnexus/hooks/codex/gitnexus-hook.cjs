#!/usr/bin/env node
/**
 * GitNexus Codex Hook
 *
 * Codex-specific hook adapter. Uses the Codex hook schema, which differs
 * from Claude Code:
 *
 *   - Only Bash events are currently supported (no Grep/Glob interception).
 *   - PreToolUse cannot inject additionalContext the way Claude Code does;
 *     output is surfaced differently.
 *   - PostToolUse is the primary path for GitNexus feedback in Codex.
 *   - Hooks are currently disabled on Windows.
 *
 * Input:  JSON on stdin — { hook_type, tool_name, tool_input, tool_output?, cwd? }
 * Output: JSON on stdout — { output: "..." } or empty (no output → silent)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ─── Input ────────────────────────────────────────────────────────────────────

function readInput() {
  try {
    const data = fs.readFileSync(0, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// ─── Index detection ─────────────────────────────────────────────────────────

/**
 * Walk up from startDir looking for a .gitnexus directory (max 5 levels).
 * Returns the path to .gitnexus/ or null if not found.
 */
function findGitNexusDir(startDir) {
  let dir = startDir || process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, '.gitnexus');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// ─── CLI invocation ──────────────────────────────────────────────────────────

/**
 * Resolve the gitnexus CLI path.
 * The setup command injects an absolute path at install time via string replacement.
 * Falls back to require.resolve for local dev / alternative install paths.
 */
function resolveCliPath() {
  let cliPath = path.resolve(__dirname, '..', '..', 'dist', 'cli', 'index.js');
  if (!fs.existsSync(cliPath)) {
    try {
      cliPath = require.resolve('gitnexus/dist/cli/index.js');
    } catch {
      cliPath = '';
    }
  }
  return cliPath;
}

function runGitNexusCli(cliPath, args, cwd, timeout) {
  if (cliPath) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      encoding: 'utf-8',
      timeout,
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }
  // If no resolved CLI, attempt npx as a last resort (slower).
  return spawnSync('npx', ['-y', 'gitnexus', ...args], {
    encoding: 'utf-8',
    timeout: timeout + 5000,
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

// ─── Pattern extraction (Bash search commands) ───────────────────────────────

/**
 * Extract a search pattern from a Bash command string.
 * Only fires for rg/grep invocations — other Bash commands are ignored.
 * Returns the pattern string or null if none can be safely derived.
 */
function extractBashSearchPattern(command) {
  if (!/\brg\b|\bgrep\b/.test(command)) return null;

  const tokens = command.split(/\s+/);
  let foundCmd = false;
  let skipNext = false;
  const flagsWithValues = new Set([
    '-e', '-f', '-m', '-A', '-B', '-C',
    '-g', '--glob', '-t', '--type',
    '--include', '--exclude',
  ]);

  for (const token of tokens) {
    if (skipNext) { skipNext = false; continue; }
    if (!foundCmd) {
      if (/\brg$|\bgrep$/.test(token)) foundCmd = true;
      continue;
    }
    if (token.startsWith('-')) {
      if (flagsWithValues.has(token)) skipNext = true;
      continue;
    }
    const cleaned = token.replace(/['"]/g, '');
    return cleaned.length >= 3 ? cleaned : null;
  }
  return null;
}

// ─── Codex hook output ───────────────────────────────────────────────────────

/**
 * Emit a Codex-compatible hook response to stdout.
 * Codex surfaces stdout output as additional context in the session.
 */
function emitOutput(message) {
  process.stdout.write(JSON.stringify({ output: message }) + '\n');
}

// ─── PreToolUse handler ──────────────────────────────────────────────────────

/**
 * PreToolUse — Bash search commands only.
 *
 * Extracts the search pattern and queries GitNexus augmentation.
 * Outputs graph context when available. This differs from Claude Code's
 * PreToolUse: Codex does not support additionalContext injection at the
 * pre-call stage the same way, so output is surfaced as session context.
 */
function handlePreToolUse(input) {
  const cwd = input.cwd || process.cwd();
  if (!path.isAbsolute(cwd)) return;
  if (!findGitNexusDir(cwd)) return;

  const toolName = input.tool_name || '';
  if (toolName !== 'Bash') return;

  const command = (input.tool_input || {}).command || '';
  const pattern = extractBashSearchPattern(command);
  if (!pattern || pattern.length < 3) return;

  const cliPath = resolveCliPath();
  try {
    const child = runGitNexusCli(cliPath, ['augment', '--', pattern], cwd, 7000);
    if (!child.error && child.status === 0) {
      const context = (child.stderr || '').trim();
      if (context) emitOutput(context);
    }
  } catch {
    /* graceful failure — never block Codex */
  }
}

// ─── PostToolUse handler ─────────────────────────────────────────────────────

/**
 * PostToolUse — stale-index detection after git mutations.
 *
 * Matches the existing Claude Code behavior but speaks Codex's output schema.
 * Preserves the --embeddings recommendation when the existing index had
 * embeddings generated.
 */
function handlePostToolUse(input) {
  const toolName = input.tool_name || '';
  if (toolName !== 'Bash') return;

  const command = (input.tool_input || {}).command || '';
  if (!/\bgit\s+(commit|merge|rebase|cherry-pick|pull)(\s|$)/.test(command)) return;

  // Only proceed if the git command succeeded.
  const toolOutput = input.tool_output || {};
  if (toolOutput.exit_code !== undefined && toolOutput.exit_code !== 0) return;

  const cwd = input.cwd || process.cwd();
  if (!path.isAbsolute(cwd)) return;
  const gitNexusDir = findGitNexusDir(cwd);
  if (!gitNexusDir) return;

  // Lightweight staleness check: compare HEAD against last indexed commit.
  let currentHead = '';
  try {
    const headResult = spawnSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf-8',
      timeout: 3000,
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    currentHead = (headResult.stdout || '').trim();
  } catch {
    return;
  }

  if (!currentHead) return;

  let lastCommit = '';
  let hadEmbeddings = false;
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(gitNexusDir, 'meta.json'), 'utf-8'));
    lastCommit = meta.lastCommit || '';
    hadEmbeddings = meta.stats && meta.stats.embeddings > 0;
  } catch {
    /* no meta — treat as stale */
  }

  if (currentHead && currentHead === lastCommit) return;

  const analyzeCmd = `gitnexus analyze${hadEmbeddings ? ' --embeddings' : ''}`;
  emitOutput(
    `GitNexus index is stale (last indexed: ${lastCommit ? lastCommit.slice(0, 7) : 'never'}). ` +
      `Run \`${analyzeCmd}\` to update the knowledge graph.`,
  );
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

const handlers = {
  PreToolUse: handlePreToolUse,
  PostToolUse: handlePostToolUse,
};

function main() {
  try {
    const input = readInput();
    // Codex uses hook_type; also accept hook_event_name for forward compatibility.
    const eventName = input.hook_type || input.hook_event_name || '';
    const handler = handlers[eventName];
    if (handler) handler(input);
  } catch (err) {
    if (process.env.GITNEXUS_DEBUG) {
      process.stderr.write('GitNexus Codex hook error: ' + String(err && err.message || '').slice(0, 200) + '\n');
    }
  }
}

main();
