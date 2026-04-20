# Caveman OpenCode Plugin

Standalone OpenCode plugin that mirrors the Caveman hooks pattern without depending on this repository.

## What it does

- Tracks Caveman mode from prompts like `/caveman`, `/caveman ultra`, `/caveman-review`, `/caveman-commit`
- Persists current mode in a flag file
- Injects a small hidden-style prompt block into OpenCode via plugin APIs
- Shows a toast when the mode changes

## Files

- `caveman-opencode.js` — standalone plugin file

## Install

Copy the plugin into your global OpenCode plugin directory:

```bash
mkdir -p ~/.config/opencode/plugins
cp caveman-opencode.js ~/.config/opencode/plugins/caveman.js
```

OpenCode automatically loads local plugins from:

- `~/.config/opencode/plugins/`
- `.opencode/plugins/`

## Notes

- State is stored in `~/.config/opencode/.caveman-active`
- This is OpenCode-native, so it does **not** implement Claude-specific statusline hooks
- The plugin is intentionally self-contained and has no repo-relative imports or setup logic
