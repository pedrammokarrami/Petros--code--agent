#!/usr/bin/env bash
set -euo pipefail

echo "========================================================================="
echo " PETROS IOS / IPADOS APP PACKAGER"
echo "========================================================================="

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR/ios"

echo "Verifying Swift files for iOS..."
if [[ -f "ContentView.swift" && -f "SimpleApp.swift" ]]; then
    echo "Found SwiftUI entrypoints: ContentView.swift & SimpleApp.swift"
    echo "To build IPA with Xcode command line tools:"
    echo "  xcodebuild -project Petros.xcodeproj -scheme Petros -destination 'generic/platform=iOS' archive -archivePath ./build/Petros.xcarchive"
    echo "  xcodebuild -exportArchive -archivePath ./build/Petros.xcarchive -exportOptionsPlist exportOptions.plist -exportPath ./dist"
else
    echo "Error: Swift files missing."
    exit 1
fi
