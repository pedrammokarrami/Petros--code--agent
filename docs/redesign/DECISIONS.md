# Decisions

D1 — Branch base. `redesign/office` was created from `redesign/point-cloud` as instructed, then
fast-forwarded to `spike/depth-points` (2 commits) so the depth-point renderer and its measured
shader patches are in the branch. The spike directory stays reference-only; nothing in `spike/`
is imported by the app.

D2 — Transport. There is no token-streaming endpoint in the server (`handleAgentChat` returns one
JSON body; `AIGateway.complete()` is non-streaming). The dock therefore posts to the real
`POST /api/chat` and animates the received text at a bounded rate, labelled `stream: 'paced'` in
the message payload. Real SSE is used where the server really streams: `GET /api/tasks/:id/events`
(18 event types). We do not claim provider streaming that does not exist.

D3 — Art. `public/scene-sources/` does not exist in the repo. Per R5 no art is generated,
downloaded or code-drawn: the build ships a labelled technical slate per room (a dark card with the
room name and "backdrop pending"), the depth pipeline runs on those slates so the renderer path is
real, and `PENDING_HUMAN_INPUT.md` lists the five exact files needed. Every placeholder scene carries `placeholder: true` in its `.dptscn` header and renders a
"<ROOM> · backdrop pending" slate label; look metrics are N/A for those rows (see
THRESHOLD_CHANGES.md, 2026-10-19) and re-enable automatically when a real source replaces the
slate. `?backdrop=flat` and the WebGL-off path render a still slate instead of points.

D4 — Missing capabilities. No TTS endpoint, no search provider, no media-generation provider.
They get adapters that return `{ configured: false, reason }`; the rooms show an honest
"not configured" state and parity rows are `n/a`. Nothing is faked.

D5 — Legacy app. The current `src/App.tsx` stays mounted and reachable at `?legacy=1` until every
parity row is `built`. Nothing is deleted in P9 until that is true.

D6 — Units and framing. LayoutEngine works in CSS px per viewport, reserves the dock band
(bottom 18%) and the header (64px), and fits the camera to the free region per aspect ratio
(the G2 gate from M2). It never receives coordinates from the model.

D7 — Depth pipeline. `scripts/scenes-build.mjs` reads every `public/scene-sources/<room>-169|916.png`,
runs Depth Anything V2 Small (`onnx-community/depth-anything-v2-small`, q8, Apache-2.0) once in
Node, caches the float map in `.cache/depth/<sha>_<w>x<h>.f32`, and writes `public/scenes/*.dptscn`
(quantised positions, normals, colour band, source luminance, occupancy). The browser never runs a
model; it fetches the binary and renders. If a source file is missing the build writes a labelled
slate and marks the scene `placeholder: true` — it never invents a picture.

## 2026-10-19 · P2 shell

- **`__sceneState.renderer` is the KIND (`points`/`poster`), never the GPU string.** Backdrop and
  PointsWorld were both writing that field, so the contact sheet read an ANGLE string and reported
  10/10 tiles "NOT POINTS". The driver name now lives in `rendererString`. Evidence: p2.txt.
- **Uploads are raw-body** (`POST /api/office/uploads`, `express.raw`, 10 MB cap) rather than adding
  multer/busboy. Server re-checks the declared type against magic bytes and generates the stored
  name; the client name is only a label. No new dependency, so no DEPENDENCIES entry.
- **The office is the default route; the old app stays at `?legacy=1`.** Nothing disappears before
  the parity matrix is green; P9 removes the legacy entry only after that.
- **Chat history is session-local** until a threads API exists (no `/api/threads` in the backend).
  Search/rename/delete work on the local list; P8 revisits if the backend gains threads.
- **Voice failures are visible.** Web Speech on headless/no-mic devices fires `error: Requested
  device not found`; returning silently to idle hid a real failure. The dock now shows the reason.
- **D-P2-1 — axe runs with `--disable-webgl`.** Headless Chromium on this container renders through
  SwiftShader and crashes the renderer intermittently while our point scene compiles (it is not
  reproducible on a GPU host). The canvas is decorative; a11y structure is not. The audit therefore
  runs in the product's own no-WebGL poster mode, which is a supported fallback, and `verify/axe.mjs`
  says so at the top. A crashed page is still counted as a failure, never skipped.
- **D-P2-2 — the renderer crash is logged, not masked.** `BACKLOG` note: the SwiftShader crash under
  load needs a fix on real CI hardware (screenshot artifacts are captured from a GPU-less container,
  so FPS there is already labelled "not representative"). P9 hardening revisits it with the leak run.

## 2026-10-22 · M3 motion

- **The settled pose is the fitted pose.** `uDolly` used to scale view space by `1 - 0.06*dolly`,
  so a finished entrance sat 6% closer than the camera `fitSubjectCamera` produced — and
  every gate (focal rect, blob crop, thirds grid) is authored against the fitted frame. On
  dev @ 1920x1080 that pushed the largest lit component from 11.16% to 18.31% and failed the
  15% ceiling. The scale is now `1 + 0.06*(1 - dolly)`: the entrance starts looser and lands
  exactly on the fit. Measured after: dev 6.82%, command 3.47%, content 4.34%, research 9.72%,
  welcome 3.69%; coverage floor 8.25% → 8.17% (command @ 1920), still above 8.
- **A same-room re-send keeps its clock.** `setData` seeded `start = now - 7000` to stop a
  reveal replay, which shoved `dolly` to 1 in a single frame (a visible 6% pop, and the frame
  that first failed the blob gate). A re-send now keeps the clock it already had; only a
  first-ever load seeds one. The entrance therefore never restarts *and* never jumps.
- **`?verify=1` pins time-based effects to their settled value.** Before, a capture inherited
  whatever millisecond of the 6 s push-in had elapsed — the same code and the same page scored
  11.2% and 18.3% on the same check. Reveal/dolly/sweep are now a function of the mode, not of
  wall-clock luck, and the ambient rig (pointer parallax + idle drift) is a no-op in verify mode
  and under reduced motion. Gate evidence is reproducible; live motion is unchanged.
- **Room changes are a dissolve, not a cut.** The outgoing cloud is retired (registry hands the
  resources back so `disposeAll()` cannot free what is still drawn) and fades over 520 ms while
  the incoming one ramps up under easeOutQuint. The fade always finishes before `__sceneReady`
  fires, so a capture never lands on the outgoing room. At most 4 ghosts are kept.
- **Motion primitives are closed-form, not per-frame lerps.** `damp` is `1 - exp(-lambda*dt)`
  and `Spring` uses the exact critically-damped solution, so 30 Hz software and 120 Hz GPU land
  on the same curve; `dt` is clamped to 50 ms so a backgrounded tab cannot produce a two-second
  step. Covered by `tests/motion.test.mjs` (samples at 30/60/120 Hz agree) and
  `tests/camera-rig.test.mjs`.
