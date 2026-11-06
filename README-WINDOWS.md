# Petros Windows Desktop Application

Autonomous Engineering & Operations AI Ecosystem — Official Windows 10 & 11 Edition

## Overview

Petros for Windows is a complete, installable desktop product engineered to run locally on Windows 10 and Windows 11 (64-bit). It starts the local autonomous engineering services, connects to local Ollama inference models, and opens an isolated, hardware-accelerated desktop application window with zero command-line interaction required.

---

## System Requirements

- **Operating System:** Windows 10 (64-bit) or Windows 11 (64-bit)
- **Architecture:** x64
- **Memory (RAM):** 8 GB minimum (16 GB recommended for local LLM inference)
- **Local AI Engine:** Ollama with `qwen3:1.7b` (or any installed model). Automatically detected at `http://127.0.0.1:11434`.

---

## Installation Options

### 1. Windows Installer (`Petros-Setup.exe`) — Recommended
1. Run `Petros-Setup.exe`.
2. Follow the setup wizard to choose your install location (defaults to `%LOCALAPPDATA%\Programs\Petros`).
3. Optionally check "Create a desktop shortcut".
4. Click **Install**.
5. Launch **Petros** from your Windows Start Menu or Desktop.

### 2. Portable Edition (`Petros-Portable.zip`)
1. Extract `Petros-Portable.zip` to any folder on your PC.
2. Double-click `Petros.exe` to launch immediately without installing.

---

## What Happens When You Launch Petros

1. **Service Auto-Discovery & Startup:**
   - Detects if the Petros production server is already running on port 3000.
   - If not, spawns the local backend service (`dist/server.cjs`) in a hidden, non-intrusive background process.
   - Connects the Laya AI router gateway on `http://127.0.0.1:20131`.
2. **Local AI Detection:**
   - Probes Ollama on `http://127.0.0.1:11434`.
   - If Ollama is running, Petros immediately connects to local inference models with zero paid API spend ($0.00).
   - If Ollama is offline, Petros attempts to start `ollama serve` or guides you to launch it.
3. **Hardware-Accelerated Desktop Window:**
   - Opens the dedicated Petros desktop window with native window borders, Petros icon, and zero browser chrome.
4. **Clean Exit & Lifecycle Management:**
   - When you close the Petros desktop window, background services spawned by the launcher terminate cleanly without leaving orphan processes.

---

## User Data & Storage Locations

Petros guarantees that your data, wallets, memory, and code projects are never deleted during updates or uninstallation:

- **User Preferences, Wallets, and Session Data:**
  `%APPDATA%\Petros` (`C:\Users\<YourUser>\AppData\Roaming\Petros`)
- **Generated Code Projects & Workspace:**
  `%USERPROFILE%\Desktop\petros` (`C:\Users\<YourUser>\Desktop\petros`)
- **Installed Application Files:**
  `%LOCALAPPDATA%\Programs\Petros` (`C:\Users\<YourUser>\AppData\Local\Programs\Petros`)

---

## Troubleshooting & Safe Mode

- **Safe Mode Console:** If you need to view raw server logs or debug backend output, launch **Petros (Safe Mode Console)** from the Start Menu or run `scripts\run-petros-windows.bat`.
- **Port 3000 In Use:** If another application is using port 3000, close that application or check Task Manager for lingering `node.exe` processes.
- **Ollama Missing:** Download and install Ollama from [https://ollama.com](https://ollama.com), then run `ollama pull qwen3:1.7b`.

---

## Uninstallation

To remove Petros:
1. Open Windows **Settings** > **Apps** > **Installed apps**.
2. Find **Petros Autonomous Engineering & Operations AI** and click **Uninstall**.
3. All application binaries, shortcuts, and registry entries are cleanly removed.
4. Your personal projects in `%USERPROFILE%\Desktop\petros` and wallets in `%APPDATA%\Petros` remain completely safe and untouched.
