========================================================================
PETROS AUTONOMOUS ENGINEERING & OPERATIONS AI - WINDOWS (x64)
========================================================================

Package Version: 4.0.0 (Release Candidate)
Target Platforms: Windows 10 (64-bit), Windows 11 (64-bit)
Architecture: x86_64 / AMD64

CONTENTS IN THIS DIRECTORY:
------------------------------------------------------------------------
1. Petros-Setup.exe (25.7 MB)
   - Official Windows installer powered by Inno Setup 6.
   - Bundles complete Node.js runtime (v24.22.1).
   - Automatically registers in Windows Start Menu and Desktop shortcuts.
   - Includes standard uninstaller in Windows "Installed apps" / "Add or remove programs".
   - Zero development tools or separate Node.js installation required.

2. Petros-Portable.zip (36.5 MB)
   - Standalone portable archive.
   - Extract to any local drive, external drive, or USB flash drive.
   - Double-click "Petros.exe" to run immediately.

HOW TO RUN:
------------------------------------------------------------------------
1. If using the installer (Petros-Setup.exe):
   - Double-click Petros-Setup.exe and follow on-screen prompts.
   - Launch "Petros" from your Windows Start Menu or Desktop.
2. If using the portable edition:
   - Extract Petros-Portable.zip.
   - Double-click Petros.exe.

SERVICES & PORTS:
------------------------------------------------------------------------
- Core Production Server: http://127.0.0.1:3000
- Laya Router Gateway:    http://127.0.0.1:20131
- Ollama Local AI Engine: http://127.0.0.1:11434 (Auto-detected if running)

STORAGE & PERSISTENCE:
------------------------------------------------------------------------
All user data, wallets, memory, and code projects are stored safely
outside the application installation directory:
- Preferences & Wallets: %APPDATA%\Petros
- Generated Code & Workspace: %USERPROFILE%\Desktop\petros
Upgrades and uninstalls will NEVER erase your projects or private keys.

TROUBLESHOOTING & SAFE MODE:
------------------------------------------------------------------------
- If port 3000 is occupied, close conflicting applications.
- To view live console output and debug logs, launch "Petros (Safe Mode Console)"
  from the Start Menu or run scripts\run-petros-windows.bat.
========================================================================
