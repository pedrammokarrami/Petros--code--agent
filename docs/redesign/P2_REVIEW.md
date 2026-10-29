# P2 review — answers and fixes

## 1. Which URL/flag/build produced the two P2 screenshots

The two images attached in the P2 report came from `verify/shots.mjs` (the P1 scene
gate), not from a UI gate. They were captured against the dev server at
`http://127.0.0.1:4173/` with Chromium launched with `--disable-webgl --disable-gpu`,
i.e. the app's own poster (`no-webgl`) mode. That is why the dock icons were there in
the DOM but not legible: `verify/shots.mjs` screenshots the scene, it never asserts on
controls, and the dock icon glyphs measured 1.4–3.3:1 against the composer.

Replacement, committed: `docs/redesign/shots/p2/<room>-<viewport>.png`, produced by

```
npm run p2:shots:webgl   # node verify/p2-shots.mjs --mode=webgl
```

- build: the committed working tree (`npm run build` output served by `verify/lib/server.mjs`)
- URL: `http://127.0.0.1:4173/` then `window.__setSpatialScene('<room>')`
- flags: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --disable-dev-shm-usage`
- sizes: exactly 1920x1080 and 390x844 (verified from the PNG headers)
- renderer: `points` on all 10 shots, `problems: []`, minimum control contrast 9.88:1
- the off/WebGL-disabled set is kept as `index.json` provenance in the same folder when
  run with `npm run p2:shots`.

The script refuses to save a shot whose control is missing, outside the viewport or below
4.5:1, so a screenshot can no longer pass while hiding a control.

## Dock control testids (read from the DOM on every shot)

| testid | what it is |
| --- | --- |
| `dock-composer` | the text input |
| `dock-attach` | attach / upload button |
| `dock-voice` | microphone (STT) toggle |
| `dock-voice-out` | speaker (TTS) toggle |
| `dock-send` | send |
| `dock-open-history` | history drawer |
| `dock-open-settings` | settings drawer |
| `room-welcome`, `room-dev`, `room-research`, `room-content`, `room-command` | room navigation |
| `open-settings` | header settings button |
| `lang-toggle` | fa/en |

## 2. Evidence header

`scripts/evidence.mjs` now prints `PASS: n FAIL: n UNVERIFIED: n`, the explicit
`UNVERIFIED: <gates>` line, and `UNVERIFIED ids: <gate>=<BLOCKERS id>`; the headline is
never `PASS` while anything was skipped. Exit codes: `1` a gate failed, `3` a gate was
skipped without a matching id in the machine-readable block at the bottom of
`docs/redesign/BLOCKERS.md`, `0` everything ran.

## 3. WebGL on and off

`e2e/office.mjs` and `verify/axe.mjs` take `--mode=webgl|off`, and their evidence files
say which mode produced them. Both modes are separate gates in the evidence run:

- e2e webgl off: 32/32 — `docs/redesign/evidence/e2e-off.txt`
- e2e webgl on: 32/32 — `docs/redesign/evidence/e2e-webgl.txt`
- axe webgl off: 0 violations / 10 pages — `docs/redesign/evidence/axe-off.json`
- axe webgl on: 0 violations / 10 pages — `docs/redesign/evidence/axe-webgl.json`
- text-over-scene contrast on the real screenshots, min 4.5: `verify/lib/contrast.mjs`,
  results per control in `docs/redesign/shots/p2/index.json` (worst measured 9.88).

## 4. GPU host

`npm run gpu-check` (`verify/gpu-check.mjs`) starts the built app on the current
machine, probes frame time (`verify/frametime.mjs`), prints the GL renderer string, runs
`verify` and `verify:leak`, and writes `docs/redesign/evidence/gpu-host.txt`. Exit 2
means a software renderer: the gates ran but the frame times are not a GPU measurement.
Human instructions: `docs/redesign/GPU_HOST.md`. No Docker, VM or cloud is assumed.

## 5. Missing images

`docs/redesign/PENDING_HUMAN_INPUT.md` lists all ten exact filenames
`public/scene-sources/<room>-169.png` and `<room>-916.png` for welcome, dev, research,
content and command.

## 6. P3 started

SceneSpec v2 contract, the director endpoint, the frame system and its tests are in
place; see `docs/redesign/evidence/p3.txt`. P4+ visual work stays gated on
`docs/redesign/evidence/gpu-host.txt`.
