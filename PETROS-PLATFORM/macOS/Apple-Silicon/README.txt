========================================================================
PETROS - macOS APPLE SILICON (arm64) RELEASE SPECIFICATION
========================================================================

Architecture: arm64 (Apple M1, M2, M3, M4 series)
Minimum macOS Version: macOS 13.0 (Ventura) or later
Hardware Acceleration: Metal Shading Language 3.0 supported
Target Output: Petros-AppleSilicon.dmg / Petros.app (arm64)
Status: PENDING NATIVE COMPILATION

COMPILATION INSTRUCTIONS FOR APPLE SILICON HOST:
------------------------------------------------------------------------
1. Requirements:
   - Apple Silicon Mac with macOS 13.0+
   - Xcode 15+ or Command Line Tools (`xcode-select --install`)
   - Node.js 20+ (arm64 native)
   - Ollama (arm64 native with unified memory inference acceleration)

2. Build Commands:
   cd mac-app
   swift build -c release --arch arm64
   mkdir -p dist/Petros.app/Contents/MacOS
   cp .build/arm64-apple-macosx/release/CodgarStudio dist/Petros.app/Contents/MacOS/Petros

3. Distribution Packaging:
   hdiutil create -volname "Petros" -srcfolder dist/Petros.app -ov -format UDZO Petros-AppleSilicon.dmg

NOTE:
In strict compliance with release verification protocols, this binary is not
fabricated or mocked on non-Apple operating systems.
========================================================================
