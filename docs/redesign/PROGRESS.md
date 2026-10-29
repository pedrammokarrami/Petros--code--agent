# PROGRESS LOG — PETROS AI REDESIGN & SPATIAL ENGINE REBUILD

## Baseline & Context
- Branch: `redesign/point-cloud`
- Server: running on http://127.0.0.1:3000 (Cloudflare tunnel active)
- Environment: Local Linux container VM with X11 / SwiftShader / headless Chromium (software WebGL)

## Resolved Tool Failures & Root Causes
1. **Playwright script timeouts on browser.close() / event loops**:
   - Cause: SwiftShader / headless Chrome thread teardown hung on process exit.
   - Fix: Use explicit `page.close()` and `browser.close()` per session, avoid stale contexts.
2. **Slow rasterization on CPU software rendering**:
   - Cause: 1920x1080 canvas with high devicePixelRatio rendered at 4K on CPU rasterizer.
   - Fix: Explicit `device_scale_factor=1` in Playwright and appropriate per-action timeout (30-40s for 1080p full frame, 2-3s for mobile).
3. **Ghost radar labels across scene transitions**:
   - Cause: `radarAxisSprites` were only cleared in `buildRadarAxisLabels()`, not in `clearWorld()`.
   - Fix: Added `this.clearRadarAxisLabels()` to `ProceduralWorldEngine.clearWorld()`.

## Implemented Visual & Engine Fixes (All 5 Scenes)
1. **Elimination of White Blown-out Blobs**:
   - Reduced point alpha to 0.08 - 0.22.
   - Adjusted bloom threshold to 0.88, bloom intensity to 0.35, preventing accumulated saturation.
   - Density mapped to deep blue (#0B3A7A) -> mid blue (#1F6FEB) -> cyan (#5CC8FF), with peak ice-white strictly limited to <0.02% of points.
   - Measured Near-white pixel ratio (>240 luminance):
     - Welcome: **0.0000%**
     - Market Research: **0.0000%**
     - Commerce: **0.0000%**
     - App Design: **0.0025%**
     - Campaign: **0.0000%**
     - Market Drawer: **0.0136%**
     *(Requirement: < 1.50% — ALL PASSED)*
2. **Removal of Random Scribble Lines**:
   - Eradicated all decorative random connect lines across all scenes.
   - Lines only represent structural relationships (radar axes, timeline arcs, inter-frame navigation flows).
3. **Point-Cloud Radar (Market Research Scene)**:
   - 5-6 concentric ring polygons created purely with GPU points.
   - 4 competitors/products (Petros AI, Traditional Leader, Vanguard Startup, Low-cost Competitor) mapped to distinct dense point-cluster polygons.
   - Crisp Persian axis labels anchored directly to radial axes.
   - Off-center composition positioned with generous negative space (>50% of screen).
4. **Commerce, App, and Campaign Scenes**:
   - Commerce: School of fish arc with hero fish and store facade.
   - App: 3 phone frame outlines on perspective arc with flow lines.
   - Campaign: Central strategy cluster, audience satellites, asset tiles on arc timeline.
5. **Removal of HTML Dashboard Card**:
   - Replaced heavy card with interactive competitor selection pills and lightweight inline badge (Name + Primary Metric).
   - Detailed metrics, breakdown and architecture moved to an on-demand slim side drawer (RTL-aware, 380px).
6. **Human Persian Labels & Bidi Isolation**:
   - Replaced raw keys (`cagr`, `marketSize`, `opportunityScore`) with Persian labels: `نرخ رشد مرکب سالانه`, `اندازه بازار هدف`, `امتیاز فرصت تجاری`, `نرخ حفظ مشتری`.
   - Formatted numbers and percentages with Unicode bidi isolation.
   - Minimum font size >= 13px desktop, 14px mobile.
7. **Dialogue Log Isolation**:
   - Reserved bottom chat band and top header.
   - Sliding chat history modal strictly bounded so it never obscures 3D scene focal points.

## Visual Verification Artifacts
- `docs/redesign/shots/welcome_1920.png`
- `docs/redesign/shots/welcome_2x.png`
- `docs/redesign/shots/welcome_mobile_390.png`
- `docs/redesign/shots/market_1920.png`
- `docs/redesign/shots/market_crop_radar_2x.png`
- `docs/redesign/shots/market_drawer_1920.png`
- `docs/redesign/shots/market_mobile_390.png`
- `docs/redesign/shots/commerce_1920.png`
- `docs/redesign/shots/commerce_2x.png`
- `docs/redesign/shots/app_1920.png`
- `docs/redesign/shots/app_2x.png`
- `docs/redesign/shots/campaign_1920.png`
- `docs/redesign/shots/campaign_2x.png`

## P3 — director, frames and contracts (2026-10-19)

- `src/office/director/sceneSpecV2.ts` implements the v2 contract from ARCHITECTURE.md:
  `{ room, frames[1..5], cues[..8], say? }`, zod `.strict()`, and the same fail-closed
  coordinate scan as v1. A cue naming an unknown frame or an event that is not a real
  SSE type rejects the spec.
- `toEngineSpec()` adapts v2 frames to the existing LayoutEngine slots, so the engine
  and its gates stayed untouched.
- `frameStateFor()` / `applyCue()` are pure; task-level events never repaint one frame.
- Director now rejects a clip the asset does not carry (`assetClips`), not only an
  unknown asset id.
- Tests: 94/94 (`npm test`), `npx tsc --noEmit` clean, `npm run build` green.

## P4 — host, first run, TTS adapter, empty states (2026-10-19)

- `src/office/host/firstRun.ts`: pure first-run state machine
  (`cold | greeting | awaiting | muted | complete`), caller supplies storage + clock, so every
  transition is testable in node. A stored mute survives reloads; typing never gets talked over.
- `src/office/host/tts.ts`: one adapter with two providers, `web-speech` and `none`. A missing
  provider is `status: 'not-configured'` and `speak()` rejects with `not-configured` — visible in the
  UI, never a silent no-op.
- `src/office/host/amplitude.ts` + `useAudioAmplitude.ts`: audio-amplitude hook that reads the
  adapter's analyser when it has one and falls back to a deterministic envelope otherwise, so the
  ring has a known shape in tests.
- `src/office/host/HostDialogue.tsx`: idle / speaking / listening states only. No avatar mesh and no
  depth backdrop (P4 hold, `PENDING_HUMAN_INPUT.md` section 4).
- `src/office/shell/EmptyState.tsx`: two kinds, `empty` (you have not done the thing) and
  `not-configured` (the product cannot do it yet), drawn differently so an empty panel is never
  mistaken for a broken feature.
- Tests: `tests/office-host.test.mjs` covers every first-run edge and every TTS status.
- Android-host candidates ranked in `docs/redesign/ASSET_REPORT.md` ("P4 android-host candidates"):
  pick `RobotExpressive.glb` (CC0, 43 joints); shipped candidate assets are never authored here.

## P5 (non-visual) — frames from the real SSE stream (2026-10-19)

- `src/office/frames/taskFeed.ts`: pure reducer from real SSE event types to frame state; the same
  task-level event never repaints more than the frame that owns it.
- `src/office/frames/useTaskFeed.ts`: the hook that subscribes and dispatches; no polling.
- `src/office/frames/CodeStream.tsx`: streamed code, monospace, cold palette, auto-scroll only when
  the reader is already at the bottom.
- `src/office/frames/ToolCallCard.tsx`: tool call and result in one card with a running/done/failed
  state, never merged into the prose.
- Tests: `tests/office-task-feed.test.mjs`. Visuals of all four stay on the P4 hold.

## Repo hygiene (2026-10-22, after `132da01`)

- Removed ~50 root-level `_*.mjs` probes, two capture dirs (`tmp-audit/` 52 MB, `tmp-comp/` 9 MB),
  and four `scripts/m2-*` audit one-offs. All were untracked; a 54 MB tarball of the exact set was
  taken before deletion (`/home/cua/workspace/petros-cleanup-backup-132da01.tar.gz`) and anything
  here is reproducible from `132da01` or from the evidence already committed under `docs/redesign/`.
- `scripts/m2-audit-shots.mjs` → `npm run verify:shots` (superset: validates tiles, refuses a stale
  dist, writes a run manifest). `scripts/_m2-copy-probe.mjs` → `npm run verify:copy` (same rooms,
  plus the stale-room check and an exit code). `scripts/_m2-assert.mjs` → `verify/run.mjs` DOM
  checks. `scripts/_m2-card.mjs` measured `.room-card`, a surface that no longer renders.
- `scripts/startup-dedupe.mjs` promoted (it is the provenance for `28d9e64`); its audit trail lives
  in `docs/redesign/evidence/data-dedupe/`, together with the note that the pre-cleanup
  `data/startups.json` is still reachable at `d330cc9` (sha256 `7c31fd7e…ab0`).
- New `verify/type-probe.mjs` covers an invariant the pixel gates do not: latin letter-spacing and
  uppercasing must collapse under `[dir=rtl]` / `[lang=fa]`.
- **Open finding from that probe** (not fixed — application change, out of this phase's scope):
  `src/index.css:41` declares the global RTL de-tracking as `[dir="rtl"], [lang="fa"], .fa { … }`,
  a bare attribute selector that matches only the root element itself. Descendants inherit nothing,
  so only the per-component rules (`.room-title`, `.frame-head`, `.host-state`) actually collapse.
  Measured on `welcome` at 1920: the `h1` (“به دفتر پتروس خوش آمدی”) keeps `letter-spacing: -1.08px`
  in RTL. Fix is `[dir="rtl"] *` (with the root kept in the list); `node verify/type-probe.mjs`
  currently exits 1 on exactly this.

## Polish A — RTL display tracking on the welcome heading (2026-10-23, `e96504f`)

- Closed the open finding above at the surface that actually rendered it: `.welcome-copy h1`
  carried `letter-spacing: -0.02em` with no RTL rule, while `.room-title` in the same file
  already had one. Measured before: `-1.08px` on the Persian heading at 1920; after: `normal`.
- `verify/type-probe.mjs` with Node 20: 5 rooms, 0 violations (before:
  `welcome` violated on exactly this element). Note the global selector at `src/index.css:41`
  is still root-only on purpose — a blanket `[dir="rtl"] *` with `font-family: … !important`
  would strip monospace from code blocks inside RTL rooms. The per-component rules plus this
  probe are the contract; the probe is what fails if a new tracked element appears.
- `tests/rtl-tracking.test.mjs`: fails if any ruleset that sets non-zero `letter-spacing`
  on `.welcome-copy`-like selectors ships without an `[dir="rtl"]`/`[lang="fa"]` companion.
  Negative control checked: removing the fix turns exactly that test red.
- `npm run verify`: 60 rows, 0 FAIL, 0 HARD ERROR. Only the two `welcome` shots changed, and
  only in the heading band; `research-mobile` also differed between two runs of identical code
  (800 px), so shot noise is not committed — evidence for this change is the probe, not a pixel diff.

## Polish B — inertia on pointer release (2026-10-23, `a0e85b3`)

- `src/office/scene/glide.ts`: `VelocityTracker` (smoothed in 1/s so 30 Hz and 240 Hz agree;
  drops samples older than the window and across a gap wider than it, so a resting pointer
  reports a click, not a throw) and `Glide` (`u(t) = v0·t·e^(−t/τ)`, closed form in elapsed
  time — no per-frame integrator, no overshoot, peak clamped to 35% of parallax, snaps to
  exactly zero at epsilon or `maxDuration`).
- `CameraRig`: glide is a third additive layer; `flick()` is a no-op when ambient is off,
  `reset()` and `setAmbient(false)` drop it, `cancelGlide()` stops a cancelled gesture without
  touching the parallax offset. `Backdrop` wires pointerdown/up/cancel with matching removal in
  `dispose()`, and a room change clears tracker and glide.
- Evidence mode is untouched: `?verify=1` and reduced motion both keep `ambient: false`, so
  every capture stays byte-stable. 12 new glide tests + 10 rig assertions (frame-rate parity at
  30/120 Hz, bound, reset, cancel, ambient-off).
- `tsc --noEmit` clean; 233 tests, 232 pass, 0 fail, 1 skipped.
