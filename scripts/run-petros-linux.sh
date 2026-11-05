#!/usr/bin/env bash
set -euo pipefail

echo "========================================================================="
echo " PETROS AUTONOMOUS ENGINEERING & OPERATIONS AI - LINUX EDITION"
echo " Petros City Web App & Unified Ecosystem"
echo "========================================================================="

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

export NODE_ENV=production
export BIND_HOST=127.0.0.1
export PORT=3000

echo "Starting Petros Production Server on http://127.0.0.1:3000..."
if command -v xdg-open > /dev/null; then
    (sleep 1 && xdg-open http://127.0.0.1:3000) &
fi

exec node dist/server.cjs
