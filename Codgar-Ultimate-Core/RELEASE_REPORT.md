# 📦 RELEASE REPORT — Codgar Ultimate (macOS DMG)

**Generated:** 2026-10-11 · Build host: macOS 12.6.3 (Darwin 21G419), x86_64

## Artifact

| | |
|---|---|
| **DMG path** | `/Users/sarir/Desktop/Codgar-Final-1/Codgar-Ultimate-Core/release/Codgar Ultimate-4.0.0.dmg` |
| **Size** | 210,859,100 bytes (≈ 201 MB) |
| **Packaging exit code** | **0** (`electron-builder --mac dmg --publish never`) |
| **Integrity** | `hdiutil verify` → checksum **VALID**; mounts and contains `Codgar Ultimate.app` + `/Applications` link |
| App bundle | `release/mac/Codgar Ultimate.app` · id `com.codgar.ultimate` · Electron 31.7.7 (x64) |
| Code signing | **not signed** (`identity: null`) — Gatekeeper will warn on first open |

## Wrapper & config (STEP 1)
No Electron/Tauri config existed (`mac-app/` is a SwiftUI shell, not a DMG pipeline), so a desktop wrapper was created:
- `main.cjs` — Electron main: spawns `dist/server.cjs` on loopback `127.0.0.1:39217`, waits for `/api/health`, opens the SPA window (contextIsolation, sandbox, external links in the default browser), kills the backend on quit (no orphans).
- `electron-builder.json` — `files: [dist/**, main.cjs, package.json]`, `asar: true`, `asarUnpack` for native/build-critical packages, mac target `dmg`, placeholder icon from `scripts/generate_icon.cjs` (`build/icon.png`, generated 512×512 PNG, no external deps).
- `package.json` — `"main": "main.cjs"`, scripts `icon` and `desktop`, Electron + electron-builder installed cleanly (dev deps).

## Defects found and fixed while packaging (all re-verified)
1. **App crashed at launch with Electron 44** — `Symbol not found: _OBJC_CLASS_$_SMAppService` (Electron 44 needs macOS 13+; this host is 12.6.3). → pinned **electron@31.7.7**, which runs on macOS 12.
2. **`Cannot find module 'esbuild'` in the packaged app** — esbuild was a devDependency, so electron-builder excluded it, yet `server.cjs` requires it at runtime. → moved `esbuild` to `dependencies` + `asarUnpack` for `esbuild`/`@esbuild`.
3. **`ERR_REQUIRE_ESM` on `vite`** — the CJS server bundle required the ESM-only vite at load time (works on Node 22, crashes on Electron's Node 20). → vite is now imported **lazily inside the dev branch**, so the production bundle never loads it.
4. **Backend could not serve the SPA from inside the app bundle** — it resolved `dist/` from `process.cwd()`. → new `CODGAR_STATIC_DIR` env serves the frontend from the bundle while the process cwd is the writable `userData` directory.

## Verification performed
- `npx tsc --noEmit` → exit 0 · `npm run build` → exit 0 · `npm test` → **23/23** (after all packaging changes).
- **Packaged backend** (Electron binary + `app.asar`, cwd outside the bundle): `/api/health` 200, `/` served the real SPA (48,009 B, text/html), `/api/security/scan` 200 → engine works inside the asar.
- **GUI launch test (15 s)**: app process stayed alive, backend answered on 39217 (`/api/health` 200, `/` 200), then app + backend were killed cleanly.
- No stray daemons/processes left; the developer server on port 3000 was untouched throughout.

## Known limitations
- **Unsigned build**: users must right-click → Open (or `xattr -dr com.apple.quarantine`) on first launch; notarisation needs an Apple Developer ID.
- x64 (Intel) target only, matching the build host; a universal/arm64 build needs `--mac dmg --arm64` on an Apple Silicon host or a universal config.
- The DMG bundles the full `node_modules` (backend requires them at runtime) → ~200 MB image, 667 MB installed.
- `package.json` still lacks `description`/`author` (electron-builder warning only).
