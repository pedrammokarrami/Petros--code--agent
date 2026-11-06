========================================================================
PETROS - macOS INTEL (x86_64) RELEASE SPECIFICATION
========================================================================

Architecture: x86_64
Minimum macOS Version: macOS 12.0 (Monterey) or later
Target Output: Petros-Intel.dmg / Petros.app (Universal/x86_64)
Status: PENDING NATIVE COMPILATION

COMPILATION INSTRUCTIONS FOR MACOS INTEL HOST:
------------------------------------------------------------------------
1. Requirements:
   - macOS 12.0+ with Xcode Command Line Tools installed (`xcode-select --install`)
   - Node.js 20+ runtime
   - Ollama for local LLM inference

2. Build Commands:
   cd mac-app
   swift build -c release --arch x86_64
   mkdir -p dist/Petros.app/Contents/MacOS
   cp .build/x86_64-apple-macosx/release/CodgarStudio dist/Petros.app/Contents/MacOS/Petros

3. Distribution Packaging:
   hdiutil create -volname "Petros" -srcfolder dist/Petros.app -ov -format UDZO Petros-Intel.dmg

NOTE:
In strict compliance with release verification protocols, this binary is not
fabricated or mocked on non-Apple operating systems.
========================================================================
