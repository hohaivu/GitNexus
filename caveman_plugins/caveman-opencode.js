import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const MODE_FILE = path.join(os.homedir(), '.config', 'opencode', '.caveman-active');

const KNOWN_MODES = new Set([
  'full',
  'lite',
  'ultra',
  'wenyan',
  'wenyan-lite',
  'wenyan-ultra',
  'commit',
  'review',
  'compress',
  'off',
]);

const MODE_PROMPTS = {
  full: [
    'Caveman mode active.',
    'Be terse and direct.',
    'Keep full technical accuracy.',
    'Avoid praise, fluff, hedging, and repetition.',
  ].join(' '),
  lite: [
    'Caveman lite mode active.',
    'Be concise and clear.',
    'Keep enough detail to avoid ambiguity.',
  ].join(' '),
  ultra: [
    'Caveman ultra mode active.',
    'Use minimum tokens.',
    'Prefer fragments over full sentences when clarity survives.',
  ].join(' '),
  wenyan: [
    'Caveman wenyan mode active.',
    'Use highly compressed style while preserving technical correctness.',
  ].join(' '),
  'wenyan-lite': [
    'Caveman wenyan-lite mode active.',
    'Use mildly compressed classical style.',
    'Prefer clarity over novelty.',
  ].join(' '),
  'wenyan-ultra': [
    'Caveman wenyan-ultra mode active.',
    'Use extreme compression while remaining understandable.',
  ].join(' '),
  commit: [
    'Caveman commit mode active.',
    'Write terse Conventional Commits.',
    'Keep subject line short.',
    'Add body only when the why is not obvious.',
  ].join(' '),
  review: [
    'Caveman review mode active.',
    'Write terse actionable review comments.',
    'Prefer format: location, problem, fix.',
  ].join(' '),
  compress: [
    'Caveman compress mode active.',
    'Compress text aggressively while preserving all technical substance.',
  ].join(' '),
};

function normalizeMode(mode) {
  const value = String(mode || '')
    .trim()
    .toLowerCase();
  if (!value) return 'full';
  if (value === 'default') return 'full';
  if (value === 'disable' || value === 'disabled' || value === 'normal' || value === 'reset') {
    return 'off';
  }
  return KNOWN_MODES.has(value) ? value : 'full';
}

function detectModeFromText(text) {
  const input = String(text || '').toLowerCase();
  if (!input) return null;

  if (/\/caveman-review\b/.test(input)) return 'review';
  if (/\/caveman-commit\b/.test(input)) return 'commit';
  if (/\/caveman(?::|\s+)compress\b/.test(input)) return 'compress';

  const offMatch = input.match(/\/caveman\s+(off|disable|disabled|normal|reset)\b/);
  if (offMatch) return 'off';

  const modeMatch = input.match(
    /\/caveman(?:\s+(full|lite|ultra|wenyan(?:-lite|-ultra)?|commit|review|compress))?\b/,
  );
  if (!modeMatch) return null;
  return normalizeMode(modeMatch[1] || 'full');
}

function collectStrings(value, bucket, depth = 0) {
  if (depth > 5 || bucket.length > 120) return;
  if (typeof value === 'string') {
    bucket.push(value);
    return;
  }
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, bucket, depth + 1);
    return;
  }

  for (const item of Object.values(value)) {
    collectStrings(item, bucket, depth + 1);
  }
}

function detectModeFromEvent(event) {
  const strings = [];
  collectStrings(event, strings);
  for (const value of strings) {
    const mode = detectModeFromText(value);
    if (mode) return mode;
  }
  return null;
}

async function ensureModeFile() {
  await fs.mkdir(path.dirname(MODE_FILE), { recursive: true });
  try {
    await fs.access(MODE_FILE);
  } catch {
    await fs.writeFile(MODE_FILE, 'full\n', 'utf8');
  }
}

async function readMode() {
  await ensureModeFile();
  try {
    return normalizeMode(await fs.readFile(MODE_FILE, 'utf8'));
  } catch {
    return 'full';
  }
}

async function writeMode(mode) {
  const normalized = normalizeMode(mode);
  await fs.mkdir(path.dirname(MODE_FILE), { recursive: true });
  await fs.writeFile(MODE_FILE, `${normalized}\n`, 'utf8');
  return normalized;
}

async function safeLog(client, level, message, extra = {}) {
  try {
    await client?.app?.log?.({
      body: {
        service: 'caveman-opencode-plugin',
        level,
        message,
        extra,
      },
    });
  } catch {
    // ignore logging failures
  }
}

async function safeToast(client, message, variant = 'info') {
  try {
    await client?.tui?.showToast?.({
      body: { message, variant },
    });
  } catch {
    // ignore toast failures
  }
}

async function safeAppendPrompt(client, text) {
  try {
    await client?.tui?.appendPrompt?.({
      body: { text },
    });
  } catch {
    // ignore prompt failures
  }
}

function buildPrompt(mode) {
  if (mode === 'off') return '';
  const instruction = MODE_PROMPTS[mode] || MODE_PROMPTS.full;
  return `\n[Caveman mode: ${mode}]\n${instruction}\n`;
}

export const CavemanOpenCodePlugin = async ({ client }) => {
  let lastInjectedMode = null;
  let initNoted = false;

  async function injectMode(mode, reason) {
    const normalized = normalizeMode(mode);
    if (normalized === 'off' || normalized === lastInjectedMode) return;
    await safeAppendPrompt(client, buildPrompt(normalized));
    await safeLog(client, 'info', 'Injected caveman mode prompt', { mode: normalized, reason });
    lastInjectedMode = normalized;
  }

  async function noteInitialization() {
    if (initNoted) return;
    initNoted = true;
    await safeLog(client, 'info', 'Caveman OpenCode plugin initialized', {
      modeFile: MODE_FILE,
      limitation: 'No Claude-style statusline hook in OpenCode plugin API',
    });
  }

  await ensureModeFile();

  return {
    event: async ({ event }) => {
      const eventType = String(event?.type || '');

      if (eventType === 'session.created' || eventType === 'server.connected') {
        await injectMode(await readMode(), eventType);
        await noteInitialization();
        return;
      }

      const detectedMode = detectModeFromEvent(event);
      if (!detectedMode) return;

      const nextMode = await writeMode(detectedMode);
      if (nextMode === 'off') {
        lastInjectedMode = 'off';
        await safeToast(client, 'Caveman mode off');
        await safeLog(client, 'info', 'Caveman mode disabled', { eventType });
        return;
      }

      await injectMode(nextMode, eventType || 'event');
      await safeToast(client, `Caveman mode: ${nextMode}`);
    },

    'tool.execute.before': async () => {
      await injectMode(await readMode(), 'tool.execute.before');
    },
  };
};

export default CavemanOpenCodePlugin;
