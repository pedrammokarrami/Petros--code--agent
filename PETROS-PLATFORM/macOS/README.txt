========================================================================
PETROS AUTONOMOUS ENGINEERING & OPERATIONS AI - macOS PLATFORM
========================================================================

Status: SOURCE READY — COMPILED BINARIES PENDING NATIVE BUILD HOST
Release: 4.0.0

AUDIT SUMMARY:
------------------------------------------------------------------------
The Petros project includes a native Swift/SwiftUI and Metal-accelerated
desktop application in the `mac-app/` directory of the source repository:
- CodgarStudioApp.swift
- CinematicAgentSurfaceView.swift (Metal shader pipeline)
- YadowCognitiveEngine.swift
- WebView.swift (WKWebView bridge)

Because this release distribution was packaged in an official Windows 64-bit
engineering environment, native macOS binary compilation (.app / .dmg)
is strictly held in PENDING status rather than fabricating unverified binaries.

TARGET ARCHITECTURES:
------------------------------------------------------------------------
1. Apple Silicon (ARM64) — M1, M2, M3, M4 Macs
   - Subfolder: macOS/Apple-Silicon/
   - Build Status: Pending Native Build on macOS arm64 host.
2. Intel (x86_64) — Legacy Intel Macs
   - Subfolder: macOS/Intel/
   - Build Status: Pending Native Build on macOS x86_64 host.

HOW TO BUILD FROM SOURCE ON MACOS:
------------------------------------------------------------------------
1. Clone repository:
   git clone https://github.com/pedrammokarrami/Petros--code--agent.git
2. Navigate to project root and execute the automated build script:
   bash scripts/build-macos.sh
3. The script compiles via Swift Package Manager (`swift build -c release`)
   and bundles `Petros.app` in `mac-app/dist/Petros.app`.
4. Alternatively, open `mac-app/Package.swift` in Xcode and select Product > Archive.
========================================================================
