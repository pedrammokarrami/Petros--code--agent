# Pending human input

## 1. Scene backdrops (blocking a real look, not the build)

Ten files (five rooms x two orientations = 10). 16:9 for desktop, 9:16 for mobile,
minimum 1920x1080 / 1080x1920, no text, no logos, no heavy transparency.
Exact filenames — the loader looks for these strings and nothing else:

```
public/scene-sources/welcome-169.png
public/scene-sources/welcome-916.png
public/scene-sources/dev-169.png
public/scene-sources/dev-916.png
public/scene-sources/research-169.png
public/scene-sources/research-916.png
public/scene-sources/content-169.png
public/scene-sources/content-916.png
public/scene-sources/command-169.png
public/scene-sources/command-916.png
```

Then run `npm run scenes:build`. Depth is computed offline (Depth Anything V2 Small, Apache-2.0)
and cached as a binary; the browser never runs a model.

Until then every room renders a labelled slate and the UI says "backdrop pending".

## 2. Licensed rigged humanoid for the welcome host

One rigged GLB (idle + talking + breathing clips, <=50k tris, clean silhouette) with a licence
URL and author. Register it in `ASSET_REPORT.md` with a sha256; then drop it in
`public/assets/characters/`. The app uses `public/assets/characters/` only; anything without a
licence entry is skipped at load and logged.

## 3. Optional providers

- TTS: a key + voice id would make `voiceOut` real; otherwise the toggle is disabled with a reason.
- Search: a provider key would make RESEARCH live; otherwise the room shows "not configured".
- Media generation: an image/video provider would make CONTENT live; same rule.

## 4. P4 hold — skinned avatar rendering and depth backdrops (logged 2026-10-19)

Status: HOLD, not blocked on code. Nothing in this section is built until both conditions below hold.

Condition A — the ten backdrop files in section 1 exist on disk:
`public/scene-sources/{welcome,dev,research,content,command}-{169,916}.png`.

Condition B — a human has run `npm run gpu-check` on a GPU machine and sent back
`docs/redesign/evidence/gpu-host.txt` with PASS for `verify`, `verify:leak` and the frame-time probe.

While the hold is on:
- The welcome host is a dialogue surface only: pulse ring, spoken line, amplitude. No mesh.
- Rooms render a labelled slate; no depth backdrop is drawn.
- The host file has been chosen and is recorded, unused: `assets/inbox/RobotExpressive.glb`
  (CC0-1.0, sha256 047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319, 43 joints).
  Evidence: `docs/redesign/ASSET_REPORT.md` section "P4 android-host candidates".
- P5 non-visual work (SSE frame state, code stream, tool-call cards) proceeds; its visuals stay on the same hold.
