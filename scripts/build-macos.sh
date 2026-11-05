#!/usr/bin/env bash
set -euo pipefail

echo "========================================================================="
echo " PETROS MACOS NATIVE APP COMPILER"
echo "========================================================================="

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR/mac-app"

echo "Building native macOS executable via SwiftPM..."
swift build -c release

APP_BIN=".build/release/CodgarStudio"
if [[ -f "$APP_BIN" ]]; then
    echo "SUCCESS: Native macOS binary compiled at $APP_BIN"
    mkdir -p "dist/Petros.app/Contents/MacOS"
    cp "$APP_BIN" "dist/Petros.app/Contents/MacOS/Petros"
    echo "Packaged Petros.app bundle in dist/Petros.app"
else
    echo "Error: Swift build failed to produce $APP_BIN"
    exit 1
fi
