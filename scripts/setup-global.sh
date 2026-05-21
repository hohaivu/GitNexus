#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "→ Installing dependencies..."
cd "$REPO_ROOT"
pnpm install

echo "→ Building gitnexus..."
pnpm --filter gitnexus build

echo "→ Packing gitnexus..."
rm -f "$REPO_ROOT"/gitnexus-*.tgz
cd "$REPO_ROOT/gitnexus"
npm pack --pack-destination "$REPO_ROOT"

echo "→ Installing packed tarball globally (replaces any npm-installed version)..."
cd "$REPO_ROOT"
npm install -g gitnexus-*.tgz

echo "✓ Done. Run: gitnexus --version"
