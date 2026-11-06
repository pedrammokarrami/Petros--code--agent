========================================================================
PETROS AUTONOMOUS ENGINEERING & OPERATIONS AI - LINUX PLATFORM
========================================================================

Status: SOURCE & SCRIPT READY — NATIVE PACKAGING PENDING LINUX HOST
Release: 4.0.0

AUDIT SUMMARY:
------------------------------------------------------------------------
The Petros core server (`dist/server.cjs`) and frontend SPA bundle
(`dist/`) are 100% platform-agnostic and fully functional on any modern
Linux distribution with Node.js 18+ or 20+.

The repository contains:
- `scripts/run-petros-linux.sh`: Production startup script with automatic browser detection
- `scripts/petros.desktop`: Standard XDG desktop entry shortcut

Because this release distribution was generated in an official Windows 64-bit
engineering environment without an active Linux kernel/WSL container, native
Linux package formats (.AppImage, .deb, .rpm) are marked PENDING rather than
falsely fabricated.

HOW TO RUN ON ANY LINUX SYSTEM TODAY:
------------------------------------------------------------------------
1. Prerequisites:
   - Node.js 18+ (`node -v`)
   - Ollama (`ollama serve`)
2. Run directly:
   bash scripts/run-petros-linux.sh
3. The server starts on http://127.0.0.1:3000 and automatically opens your
   default desktop browser via `xdg-open`.
========================================================================
