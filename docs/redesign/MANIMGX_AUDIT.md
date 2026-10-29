# ManimGX integration audit

Date: 2026-10-19 · Auditor: Mochi (frontend/architecture review)
Scope: read-only. Nothing was installed and no application code was modified.

Repo audited: https://github.com/academa-labs/manimgx (MIT, default branch `main`,
default branch head pushed 2026-10-15, created 2026-10-05, 1869 stars, 25 open issues).
Published artefacts checked: `manimgx@0.1.1` on npm, `manimgx==0.1.1` on PyPI.

---

## 1. What ManimGX actually is

ManimGX is an **offline/bulk animation renderer**: a Manim CE-compatible Python API
compiled to a Rust + wgpu core, whose output is a film (frames or MP4). The browser build
is a **player** for those films, not a scene library.

Evidence (repo `browser/README.md`):

> "a scene written in Python … made and played in the page by ManimGX's own player,
> drawn with WebGPU."
> "[Pyodide] runs the scene in a Web Worker, with ManimGX installed from PyPI."
> "the film is recorded as it is made (a *take*: each shape once, then each frame)"
> "The first film downloads Python (Pyodide, about 6 MB) and ManimGX (about 20 MB)."

Consequences for an interactive product:

- The Python scene must **compile and run to completion** before frames exist. Every edit
  to the source "makes the film again".
- The player owns its canvas, its controls, its timeline, its captions and its fonts
  (`browser/src/player.ts`: `Player::new(canvas, time, playing, mac)` creates its own GPU
  surface). It is embeddable, not composable: you cannot feed it a scene graph or read
  back individual objects.
- There is no JS/TS scene API. The only authoring surface is Python + Manim semantics.

This is the opposite contract from the Petros workspace, where the director emits a small
JSON `SceneSpec` per turn and the renderer must respond within one frame.

---

## 2. Our current stack (what it would be compared against)

| Concern | Petros today | Evidence |
|---|---|---|
| Contract | `SceneSpecV2` z-validated, **coordinates rejected** (`COORD_KEYS` incl. `xPct/scale/rotation`) | `src/office/director/sceneSpecV2.ts:97-107` |
| Layout | deterministic, seeded, FNV-1a hash, no `Math.random`/`Date` | `src/engine/spatial/layoutEngine.ts:1-60` |
| Renderer | three r186, WebGL2, **one `THREE.Points` draw**, additive, `depthWrite:false`, DPR-aware, world-space sprite with soft growth | `src/office/scene/Backdrop.ts:85-200`, `sceneShader.ts` |
| Budgets | 60k low / 120k med / 250k high desktop, 30k/60k/80k mobile | `src/office/scene/tiers.ts` |
| Degradation | flat poster with reason text when WebGL is absent; labelled software tier | `SceneHost.ts:112-130`, `tiers.ts isSoftwareRenderer` |
| Bundle | 1.29 MB JS + 388 KB CSS (+ point/scene data chunks) | `du -sh dist/assets` |
| Gate | 20 rows × 60 checks, thresholds in `verify/thresholds.json` | `verify/run.mjs` |

Measured in this session (headless Chromium, SwiftShader):

```
1440x900  canvas 1440x900 dpr 1  points 105561  fit dist 9.88  fps 1 (software)
```

FPS is not representative on SwiftShader; it only proves the frame budget is spent in
fragment shading on 105k sprites, which is the known software ceiling.

---

## 3. Platform reality

### 3.1 Hard GPU requirements (first-party code)

`rust/engine/src/render.rs`:

```rust
if !blends_float32(&adapter) {
    return Err("the GPU cannot blend float32 targets (a view adds its coverage in one)".into());
}
if !adapter.features().contains(wgpu::Features::DEPTH32FLOAT_STENCIL8) {
    return Err("the GPU cannot use float32 depth with stencil …".into());
}
```

Two optional WebGPU features are **mandatory**, and failure is a hard error, not a
fallback. `float32-blendable` is historically the least universally supported optional
feature, and it is exactly the one that decides whether old Intel/AMD Mac GPUs can run it.

### 3.2 Browser matrix

Per `browser/README.md`: "Chrome and Edge 113+, Safari 26, Firefox 141+ on Windows (not
yet with the float32 blending ManimGX's renderer uses)."

- Safari 26 is not installable on macOS 12 Monterey (Safari is tied to the OS major).
- Firefox is explicitly **excluded** by the same document for this renderer.
- Chrome 113+ is the only realistic path on an Intel Mac on Monterey, and only if that
  GPU advertises `float32-blendable` + `depth32float-stencil8`.

### 3.3 This VM cannot test it at all

```
navigator.gpu → undefined   (headless Chromium, --enable-unsafe-webgpu --enable-features=Vulkan)
{"gpu":false}
```

So CI (including our `verify` harness) **cannot** gate a ManimGX feature. Any ManimGX path
is untestable in the current pipeline and would need a manual, GPU-backed device in the
loop — a real regression-gate hole.

### 3.4 Mobile

Mobile Safari has no WebGPU before iOS 26; Android Chrome support is present but the
adapter-feature requirement still applies. Our current renderer already serves mobile at
30–80k points with the same look. ManimGX would add a second, differently-degrading
renderer for the same screen.

---

## 4. Bundle, latency, cost

| Metric | Value | Source |
|---|---|---|
| npm tarball | **20,123 B unpacked, 8 files** | `npm view manimgx@0.1.1 dist.unpackedSize dist.fileCount` |
| `dist/` contents | `manimgx.js` 11,443 B + 4 `.d.ts`, **no `director.js`, no `.wasm`** | `tar tzvf manimgx-0.1.1.tgz` |
| `dist/director.js` on unpkg | **404** | `curl -I unpkg.com/manimgx@0.1.1/dist/director.js` |
| `dist/director.js` on jsDelivr | **404** | same, `cdn.jsdelivr.net` |
| Python wheel `pyemscripten_2026_0_wasm32` | **17.69 MB** | PyPI JSON API |
| Pyodide | ~6 MB (README) + CDN dependency on `cdn.jsdelivr.net/pyodide/v314.0.7` | `player.ts:18` |
| Cold start (documented) | Pyodide boot + micropip install of a 17.7 MB wheel + Python scene compile | `browser/README.md`, `director.ts` |

**The published package is broken as documented.** `browser/README.md` says
`import "manimgx"` and then a `define()` export; the actual module exports only
`{ ManimgxPlayer, settings }`:

```
log: [ 'start', 'imported: ManimgxPlayer,settings', 'define throw: mod.define is not a function', 'appended' ]
```

The element self-registers but spawns `new Worker(new URL("./director.js", import.meta.url))`,
and that file is 404 on both CDNs. So `npm i manimgx` today yields a player that can never
start a film.

Estimated cost for the Petros shell if adopted as the primary renderer: ~24 MB cold
payload + Python runtime on *every* first visit, versus 1.29 MB of JS today — on a
chat-first product whose scene changes on every assistant turn.

---

## 5. Fit against our requirements

| Requirement | ManimGX | Verdict |
|---|---|---|
| Responds to a streamed `SceneSpec` per turn | Requires Python compile of a whole film per source change | ✗ |
| Deterministic, seeded layout owned by our engine | Layout lives in Python/Manim, outside `layoutEngine` | ✗ (would duplicate) |
| Points + holographic language (Look Lock) | Own renderer with its own materials/faces; cannot be given our shader | ✗ |
| Runs inside the existing shell / drawer / chat band | Own canvas + own controls and fonts; would need an iframe-like box | ~ |
| Persian RTL and our type scale | "all in ManimGX's fonts" | ✗ |
| Graceful fallback | Hard error string on missing GPU features; no JS fallback | ✗ |
| CI-gated | WebGPU absent in the harness | ✗ |
| Math/3D explainer *films* | Its actual strength | ✓ |

---

## 6. Alternatives that fit better if we ever need "video-like" content

- **three.js animation + `WebGLRenderer` into a `CanvasTexture` / `<video>`-like surface** —
  we already ship three 0.186; zero new dependency, same fallback path as the backdrop.
- **`motion` (already a dependency)** for 2D vector transitions in DOM frames.
- **`troika-three-text` (already a dependency)** for crisp 3D text/math-free labels.
- **ManimCE / ManimGX offline on the server** for pre-rendered explainer MP4s served as a
  `player` frame — same content value, none of the browser-side risk.

---

## 7. Recommended integration boundary (if approved later)

Boundary: a **`player` frame** in SceneSpec v2 (the kind already exists) renders an
MP4/WebM produced offline; ManimGX is used only as an offline producer, never as a
browser renderer. The live scene stays 100% our three.js points pipeline.

If in-browser film playback is ever required, the hard rules would be:

1. Never in the main canvas. A separate `<iframe sandbox>` on its own origin path.
2. Gated by `navigator.gpu` **and** an explicit `requestAdapter` feature check for
   `float32-blendable` + `depth32float-stencil8` before any network fetch.
3. Never on the app's critical path; lazy-loaded only when a frame of kind `player`
   is present.
4. Never touching `layoutEngine`, `SceneSpecV2` coordinates, or the Look Lock shader.
5. Self-hosted assets (no jsDelivr / PyPI at runtime) so the app still works offline —
   which our own gate already requires.

---

## 8. Proof of concept (isolated, if you want data)

One static file, no build or bundle change:
`public/poc/manimgx-poc.html`, served by the existing server at `/poc/manimgx-poc.html`.

It would:

1. Feature-detect `navigator.gpu`, request a high-performance adapter, log
   `adapter.features` and `adapter.info` (this is the make-or-break bit on Intel Macs).
2. Only if both required features are present, boot the player with one 5-second scene.
3. Record: bytes downloaded, time to first frame, time to full take, FPS during playback.
4. Show the same information as plain text when the GPU is insufficient.

Blocker for the PoC as specified: `manimgx@0.1.1` has no `director.js` and no wasm, so the
PoC would need either a build from a pinned commit (`browser/build.ts`, requires Bun) or
the next published version. That build step must be approved separately.

Measured today: zero bytes can be evaluated in CI, because the harness has no WebGPU.

---

## 9. Decision

**NO-GO** for ManimGX as the interactive scene renderer, and **no** second layout engine.

Reasons, in order of weight:

1. Contract mismatch: film-based Python rendering vs per-turn JSON scene updates.
2. Hard WebGPU feature requirement with a hard error and no fallback.
3. The published browser package cannot start (404 `director.js`), so it cannot be
   evaluated as shipped.
4. ~24 MB cold payload and a Python runtime on a chat-first page.
5. Untestable in our gate; would silently defund `npm run verify`.

**Conditional GO** only for the offline role: ManimGX may be used on the build/server side
to pre-render explainer clips into `player` frames, with MP4 output and our existing
poster fallback. That path touches no renderer, no layout engine, and no bundle.

---

## 10. Evidence commands

```
curl -s https://api.github.com/repos/academa-labs/manimgx | jq '{license,stargazers_count,open_issues_count,pushed_at}'
curl -s https://api.github.com/repos/academa-labs/manimgx/languages
npm view manimgx@0.1.1 version license dist.unpackedSize dist.fileCount time.modified
npm pack manimgx@0.1.1 && tar tzvf manimgx-0.1.1.tgz
curl -o /dev/null -w '%{http_code}' https://unpkg.com/manimgx@0.1.1/dist/director.js   # 404
curl -o /dev/null -w '%{http_code}' https://cdn.jsdelivr.net/npm/manimgx@0.1.1/dist/director.js  # 404
curl -s https://pypi.org/pypi/manimgx/json   # pyemscripten wheel 17.69 MB
curl -s https://raw.githubusercontent.com/academa-labs/manimgx/main/rust/engine/src/render.rs | sed -n 1068,1090p
node -e "chromium … navigator.gpu"            # {"gpu":false} in the harness
```
