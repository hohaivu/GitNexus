#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITNEXUS_DIR="$SCRIPT_DIR/../gitnexus"

cd "$GITNEXUS_DIR"

# Reinstall deps if node_modules missing
if [ ! -d node_modules ]; then
  echo "[rebuild] node_modules missing — installing..."
  npm install --ignore-scripts
  (cd node_modules/@ladybugdb/core && node install.js) 2>/dev/null || true
  node scripts/build-tree-sitter-dart.cjs
  node scripts/build-tree-sitter-proto.cjs
fi

echo "[rebuild] building..."
pnpm run build

echo "[rebuild] linking globally..."
npm link

echo "[rebuild] done — $(gitnexus --version)"
