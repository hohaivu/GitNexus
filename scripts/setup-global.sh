#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "→ Installing dependencies..."
cd "$REPO_ROOT"
pnpm install
pnpm --dir "$REPO_ROOT/gitnexus" install --ignore-scripts

echo "→ Building gitnexus..."
pnpm --dir "$REPO_ROOT/gitnexus" build

echo "→ Linking globally (replaces any npm-installed version)..."
cd "$REPO_ROOT/gitnexus"
npm link

echo "✓ Done. Run: gitnexus --version"
