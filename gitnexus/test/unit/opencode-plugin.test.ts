import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createGitNexusOpenCodePlugin,
  extractSearchPattern,
  isSuccessfulToolExecution,
} from '../../plugins/opencode/plugin-utils.js';
import { GitNexusOpenCodePlugin } from '../../plugins/opencode/gitnexus.js';

describe('OpenCode plugin helpers', () => {
  it('extracts supported search patterns', () => {
    expect(extractSearchPattern('grep', { pattern: 'validateUser' })).toBe('validateUser');
    expect(extractSearchPattern('glob', { pattern: '**/AuthService.ts' })).toBe('AuthService');
    expect(extractSearchPattern('bash', { command: 'rg "validateUser" src/' })).toBe(
      'validateUser',
    );
    expect(extractSearchPattern('bash', { command: 'npm test' })).toBeNull();
  });

  it('treats non-zero tool execution as failure', () => {
    expect(isSuccessfulToolExecution({}, { exitCode: 0 })).toBe(true);
    expect(isSuccessfulToolExecution({}, { exit_code: 1 })).toBe(false);
    expect(isSuccessfulToolExecution({ tool_output: { exit_code: 0 } }, {})).toBe(true);
  });

  it('plugin entry file only exports plugin entrypoints', () => {
    expect(Object.keys({ GitNexusOpenCodePlugin })).toEqual(['GitNexusOpenCodePlugin']);
  });
});

describe('OpenCode plugin behavior', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gn-opencode-plugin-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('appends GitNexus context for supported search tools in indexed repos', async () => {
    const repoDir = path.join(tempDir, 'repo');
    fs.mkdirSync(path.join(repoDir, '.gitnexus'), { recursive: true });

    const appendPrompt = vi.fn().mockResolvedValue(true);
    const showToast = vi.fn().mockResolvedValue(true);
    const log = vi.fn().mockResolvedValue(true);
    const spawnSyncImpl = vi.fn().mockReturnValue({ status: 0, stderr: 'graph context' });

    const plugin = await createGitNexusOpenCodePlugin({
      spawnSyncImpl,
      cliPathResolver: () => '/tmp/gitnexus-cli.js',
    })({
      client: { app: { log }, tui: { appendPrompt, showToast } },
      directory: repoDir,
      worktree: repoDir,
    });

    await plugin['tool.execute.before'](
      { tool: 'grep', args: { pattern: 'validateUser', cwd: repoDir } },
      { args: { pattern: 'validateUser', cwd: repoDir } },
    );

    expect(spawnSyncImpl).toHaveBeenCalledWith(
      process.execPath,
      ['/tmp/gitnexus-cli.js', 'augment', '--', 'validateUser'],
      expect.objectContaining({ cwd: repoDir }),
    );
    expect(appendPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ text: expect.stringContaining('graph context') }),
      }),
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ message: expect.stringContaining('validateUser') }),
      }),
    );
  });

  it('does nothing for unsupported tools', async () => {
    const appendPrompt = vi.fn();
    const showToast = vi.fn();
    const spawnSyncImpl = vi.fn();

    const plugin = await createGitNexusOpenCodePlugin({ spawnSyncImpl })({
      client: { tui: { appendPrompt, showToast } },
      directory: tempDir,
      worktree: tempDir,
    });

    await plugin['tool.execute.before'](
      { tool: 'read', args: { filePath: 'src/index.ts', cwd: tempDir } },
      { args: { filePath: 'src/index.ts', cwd: tempDir } },
    );

    expect(spawnSyncImpl).not.toHaveBeenCalled();
    expect(appendPrompt).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('shows stale-index warning only for successful git mutations', async () => {
    const repoDir = path.join(tempDir, 'repo');
    const gitnexusDir = path.join(repoDir, '.gitnexus');
    fs.mkdirSync(gitnexusDir, { recursive: true });
    fs.writeFileSync(
      path.join(gitnexusDir, 'meta.json'),
      JSON.stringify({ lastCommit: 'deadbeef1234567', stats: { embeddings: 1 } }),
      'utf-8',
    );

    const showToast = vi.fn().mockResolvedValue(true);
    const log = vi.fn().mockResolvedValue(true);
    const spawnSyncImpl = vi.fn().mockImplementation((command: string) => {
      if (command === 'git') {
        return { stdout: 'cafebabe7654321\n' };
      }
      return { status: 0, stderr: '' };
    });

    const plugin = await createGitNexusOpenCodePlugin({ spawnSyncImpl })({
      client: { app: { log }, tui: { showToast } },
      directory: repoDir,
      worktree: repoDir,
    });

    await plugin['tool.execute.after'](
      { tool: 'bash', args: { command: 'git commit -m "msg"', cwd: repoDir } },
      { args: { command: 'git commit -m "msg"', cwd: repoDir }, exitCode: 0 },
    );

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining('gitnexus analyze --embeddings'),
        }),
      }),
    );

    showToast.mockClear();
    await plugin['tool.execute.after'](
      { tool: 'bash', args: { command: 'git commit -m "msg"', cwd: repoDir } },
      { args: { command: 'git commit -m "msg"', cwd: repoDir }, exitCode: 1 },
    );
    expect(showToast).not.toHaveBeenCalled();
  });
});
