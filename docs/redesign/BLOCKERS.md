# Blockers

Open items that have survived three fix attempts, with the evidence that bounds them.
Source of every number below: `docs/redesign/verify_shots/last-run.json` and
`docs/redesign/evidence/M2.txt`, produced by `npm run evidence -- M2` on 2026-10-18.

## Gate state

84 rows, 58 pass, 26 fail. Nothing was thresholded to fit: every limit in
`verify/thresholds.json` is unchanged except the two documented metric-domain corrections in
`THRESHOLD_CHANGES.md` (dHash -> composition distance; full frame -> canvas for coverage).

| failing check | rows |
| :--- | ---: |
| non-bg % (8-40) | 22 |
| lit components >= 500 in 2x crop | 4 |
| largest component < 15 % | 4 |
| composition distance >= 0.3 | 3 |
| amber % of non-bg | 1 |
| console errors / failed requests | 1 |

## B1 — The point cloud does not put enough light on the art region

Status: open. Measured, root cause located, not yet fixed.

Coverage of the canvas capture, and the same frame re-measured with the reserved drawer
(right 28 %) and chat band (bottom 18 %) cut out:

| scene | canvas (gate) | canvas minus drawer+chat |
| :--- | ---: | ---: |
| welcome desktop | 4.23 | 2.48 |
| dev_room desktop | 3.43 | 2.67 |
| store desktop | 5.44 | 5.78 |
| research desktop | 4.39 | 5.30 |
| app desktop | 4.23 | 2.48 |
| marketing desktop | 2.50 | 1.44 |

Two separate facts, both measured:

1. The drawer is the brightest thing on the canvas. On welcome desktop the rightmost 10 % of
   columns carries 26.1 % of all lit pixels; the ten column bands of actual scene art carry
   0.6-2.7 % each. The full-canvas number is therefore partly UI, which is why the art-region
   reading is lower, not higher.
2. Even counting everything, the scene occupies ~2-5 % of the canvas. The gate wants 8-40 %.

Root cause: at the shipped 120 000-point default budget (tiered, `src/engine/points/PointsWorld.ts`)
the cloud is fit into a world box that the ~2.0 m-tall camera window does not fill, and the
surviving points are 0.7-1.5 px. Screen-space footprint, not point count, is the binding
constraint: `public/assets/points/*.ptsbin` hold 140k-250k points but only 120k are drawn.

Rejected by measurement, do not retry blindly:
- larger point size: raises coverage but merges dots into blobs (store desktop largest component
  already 28.5 % at the current size).
- scaling the cloud down: 0.55x-1.9x sweep moved marketing coverage 1.8 % -> 5.1 %, still short.
- raising the default budget: contradicts the instructed 120k/60k default tier.

Next: fit the cloud tighter to the camera frustum (~85 % of frame height) so the same 120k
points land on more pixels per point without enlarging the sprite, then re-measure.

### B1a — Why the 8% floor cannot be met at the 120k default tier (measured bound)

"Fit the cloud tighter" was tried and does not apply: the clouds are already framed. Measured with
`scripts/probe.mjs` against the built bundle: behind-camera points 0% in every scene, inside-frustum
57-98% (welcome loses the most because its source is 5.4 m wide against a 3.6 m camera window).

The binding constraint is arithmetic, not framing. The gate counts a pixel as art when its luma
clears background + 6. With the soft gaussian sprite the shader uses, one point's above-threshold
core is about one pixel: raising per-point alpha 0.42 -> 0.90 moved welcome's canvas coverage from
4.20% to 6.05% and then stopped. On a 1920x1080 canvas (2,073,600 px) a 120,000-point budget
therefore caps out near 5.8%, and several desktop scenes sit below 8%.

What was tried, and what it measured (desktop 1920x1080):
- point size sweep 2.0 -> 14 px: coverage 3.0% -> 7.8%, but above ~9 px store and dev_room fuse
  into one component well past the 15% blob limit.
- per-point alpha 0.42 -> 1.0: coverage 3.1% -> 6.1%, then the shader saturates.
- gain 12 -> 30: coverage 4.2% -> 4.9%; the ramp clamps at c3.
- cloud scale 0.55x -> 1.9x: rejected earlier (marketing 1.8% -> 5.1%).

The 250k tier would clear it (same per-point lit area implies ~11% at 250k). That tier is gated
behind a non-software GPU and a passing frame-time probe; this gate machine renders through
SwiftShader, so the gate itself can never enter it. Raising the default is an instructed budget
change and is the person's call.

Decision: thresholds untouched, tier rule untouched, real occupancy clamp landed, bound recorded.

## B2 — Two compositions are not distinguishable at two viewports

Status: open, downstream of B1.

`composition distance` fails on welcome vs marketing @ mobile (0.20), welcome vs research @
tablet (0.00) and welcome vs app @ desktop (0.03). The tablet pair scores exactly 0 while the
two PNGs are byte-different, i.e. both occupancy grids are essentially empty: the metric has no
signal to compare. This is a symptom of B1, not an independent defect.

## B3 — One third-party font request flaked

Status: transient, not code.

research @ mobile logged `net::ERR_CONNECTION_CLOSED` for the `fonts.googleapis.com` CSS URL.
Self-hosting the fonts would make the gate deterministic; it is a separate concern from M2 and
has not been done.

## B4 — Suppressed (resolved)

The 8x8 dHash distinctness check and the full-frame coverage domain were measurement defects,
not art defects. Both are fixed, with controls and evidence in `THRESHOLD_CHANGES.md` and
`docs/redesign/evidence/composition-controls.txt` (same scene <= 0.032, different scenes >= 0.637).

## B5 — Suppressed (resolved): G2 now fits the free region per aspect

Status: open, time-box expired.

Evidence: `docs/redesign/evidence/M2.txt` — `dev_room @ mobile-390x844` and `@ tablet-768x1024`
report `G2 hero in frame = out: desk`; `store @ mobile-390x844` and `@ tablet-768x1024`
report `out: storefront_counter`.

Cause: the portrait framing pass centres the character and keeps the human inside the margin,
but secondary hero props (desk, counter) are placed relative to the character and then fall
outside the tightened frame on tall narrow viewports.

Attempts so far: one framing change (D3 commit `cf66ac0`). Two fix attempts remain before this
becomes a hard stop under the instructed rule.

## B6 — Suppressed (resolved): per-scene registry disposes on switch (dGeo=0 dTex=0 over 20)

Status: open, diagnosis attached.

`verify:leak` reports `switches=20 before={"geometries":1,"textures":0}
after={"geometries":5,"textures":4} dGeo=4 dTex=4 limit<=2`.

This is a consequence, not a regression: before commit `35ac032` (last request wins in setScene)
most switches resolved to the same scene and the gate was measuring a no-op. Now each switch
really builds a cloud, and the previous cloud's geometry, bone texture and sprite texture are
not disposed. Fix is disposal in `PointsWorld.setCloud`, not a threshold change.

## B1 — coverage floor (unchanged)

Status: open, as before. See above; thresholds untouched.

## B7 — Time box exceeded, and what still fails

The 90-minute box was consumed by three hung evidence runs: the contact sheet composed
twelve full-resolution PNGs in one Chromium `fullPage` screenshot and stalled after a
renderer restart. That step is now a Pillow compositor (`verify/compose-sheet.py`) that
finishes in 203s inside the evidence run, but the re-run needed the full build/test/
selftest/leak/contact-sheet/verify sequence each time.

Fixed and measured in this box: G2 (no G2 row in `M2.txt`), leak (20 switches,
dGeo=0 dTex=0), G5 (selftest fixture fails at 84.8%), contact-sheet labels and
renderer column (12/12 tiles `points`, `notPoints=0`).

Still failing, thresholds untouched: the non-bg coverage floor (8-40%) on 8 of 24
rows, and `largest component %` (<15%) on dev_room mobile, research laptop/desktop,
app laptop/desktop and store desktop. Both are density issues: the sampler budget and
the Instrument B pixel rule, not composition or scale. G3 hero height (25-70%) fails on
dev_room and store at 390x844 only, where the free region is 1.9x taller than wide.

Measured in the same run: mean canvas luma 4.35-7.19, lit 0.46-5.36%, so the mobile
tiles are not darker than desktop (`docs/redesign/evidence/mobile-luminance.md`).

## B8 — verify and leak cannot complete in this container after P2 (headless WebGL)

Status: open, environment-bound. Three attempts:

1. `npm run evidence -- p2` — `npm run verify` ran 12m32s with no exit (`ps`: `node verify/run.mjs`, etime 12:32), killed.
2. `npm run verify:leak` alone — raw:

```
$ npm run verify:leak
LEAK ERROR TimeoutError: page.waitForFunction: Timeout 15000ms exceeded.
```

3. `verify/axe.mjs` first attempt — `browserContext.newPage: Target crashed`, then
   `page.goto: net::ERR_CONNECTION_REFUSED` after the renderer took the server down.

A plain Playwright page with `--disable-webgl` loads every room and audits clean; the same page
with WebGL on crashes the renderer intermittently while our scene compiles, on SwiftShader only
(`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))`). This is the renderer the earlier
M2 FPS numbers were labelled "not representative" for. Not a measured leak: the leak run never got
to the switch loop. Evidence: `docs/redesign/evidence/p2.txt` (skips are printed in the file),
`docs/redesign/evidence/axe.json` (10/10 pages, 0 violations in poster mode).

Next step needs a GPU host (or GitHub Actions with `--use-gl=egl`), then re-run `verify` and
`verify:leak` unchanged. Thresholds are untouched.

<!-- blockers:start
[
  {"id": "B8", "status": "open", "gates": ["npm run verify", "npm run verify:leak"],
   "why": "headless SwiftShader crashes the renderer while the points scene compiles; verify runs past 12m without an exit and leak never reaches its switch loop",
   "check": "npm run gpu-check on a machine whose GL renderer string is not SwiftShader/llvmpipe"}
]
blockers:end -->

### B8 auto-proceed (2026-10-19T10:20Z)

B8 has been open since 2026-10-19T03:52Z — over 90 minutes without `docs/redesign/evidence/gpu-host.txt`.
Per the P4 gate rule, visual P4+ work proceeds on the engine's poster/flat path (the one the a11y
gate already audits), and stays labelled "SwiftShader-independent" until a GPU host runs
`npm run gpu-check` and writes `evidence/gpu-host.txt`. No threshold changed.
