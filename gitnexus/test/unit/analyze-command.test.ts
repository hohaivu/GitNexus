import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

const forkMock = vi.fn();

const bar = {
  start: vi.fn(),
  update: vi.fn(),
  stop: vi.fn(),
};

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
  fork: forkMock,
}));

vi.mock('cli-progress', () => ({
  default: {
    SingleBar: vi.fn(function SingleBar() {
      return bar;
    }),
    Presets: { shades_grey: {} },
  },
}));

vi.mock('../../src/storage/git.js', () => ({
  getGitRoot: vi.fn(() => '/repo'),
  hasGitDir: vi.fn(() => true),
}));

vi.mock('../../src/storage/repo-manager.js', () => ({
  getStoragePaths: vi.fn(() => ({ storagePath: '/repo/.gitnexus' })),
  getGlobalRegistryPath: vi.fn(() => '/tmp/gitnexus-registry.json'),
}));

vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn().mockResolvedValue(undefined),
  },
}));

class FakeChildProcess extends EventEmitter {
  stderr = new EventEmitter();
  exitCode: number | null = null;
  killed = false;
  send = vi.fn();
  kill = vi.fn(() => {
    this.killed = true;
    return true;
  });
}

describe('analyzeCommand', () => {
  const originalNodeOptions = process.env.NODE_OPTIONS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    process.env.NODE_OPTIONS = '--max-old-space-size=8192';
  });

  afterEach(() => {
    process.env.NODE_OPTIONS = originalNodeOptions;
    vi.restoreAllMocks();
  });

  it('treats worker exit after complete as success', async () => {
    const child = new FakeChildProcess();
    forkMock.mockReturnValue(child);

    child.send.mockImplementation(() => {
      queueMicrotask(() => {
        child.emit('message', {
          type: 'complete',
          result: {
            repoName: 'GitNexus',
            repoPath: '/repo',
            stats: { nodes: 10, edges: 20, communities: 3, processes: 4 },
          },
        });
        child.exitCode = 1;
        child.emit('exit', 1, null);
      });
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { analyzeCommand } = await import('../../src/cli/analyze.js');

    await analyzeCommand();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(process.exitCode).toBeUndefined();
    expect(forkMock).toHaveBeenCalledTimes(1);
    expect(child.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        options: expect.objectContaining({
          includePipelineResult: false,
        }),
      }),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Repository indexed successfully'));
  });

  it('requests pipeline result only when --skills is enabled', async () => {
    const child = new FakeChildProcess();
    forkMock.mockReturnValue(child);

    child.send.mockImplementation(() => {
      queueMicrotask(() => {
        child.emit('message', {
          type: 'complete',
          result: {
            repoName: 'GitNexus',
            repoPath: '/repo',
            stats: { nodes: 10, edges: 20, communities: 3, processes: 4 },
          },
        });
      });
    });

    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { analyzeCommand } = await import('../../src/cli/analyze.js');

    await analyzeCommand(undefined, { skills: true });

    expect(child.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        options: expect.objectContaining({
          force: true,
          includePipelineResult: true,
        }),
      }),
    );
  });
});
