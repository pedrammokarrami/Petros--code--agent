# Lit points: computed, not tuned

ART_DIRECTION §1 says amber is the only warm colour and only means live work; §4 says the
dev room's monitors are what glows. Turning that sentence into pixels was done by trial and
error for months — add points, render, measure, shift a number, render again. That loop has
no way to answer *why* the same scene reads 0.6 % on a phone and 1.45 % on a desktop, so it
can only converge by luck, and it did: amber once measured 0.00 % because the points were
authored outside the camera's visible span, and a compaction step silently put the amber
flags on the wrong points.

The fix is a forward model of the signal, in `src/office/scene/lightField.ts`:

**1. Where a point lands.** `projectPoints` runs each emitter through the *same* camera the
renderer builds (`cameraFor` → `fitSubjectCamera`, same fov, same aspect, same free-region
fit with a 6 % pad) and sizes each sprite with the *same* formula as the vertex shader:
`min(max(worldSize * pxPerUnit / depth, 1), maxPx * dpr)`. Nothing is estimated.

**2. What that covers.** `coveredPixels` rasterises the union of the sprite discs at the
share that survives the amber gate (`SPRITE_GATE_SHARE = 0.36` of the disc's area reaches
sat ≥ 0.5 and luma ≥ 40 on composite). Union, not sum: overlapping points are not counted
twice.

**3. What share of the frame that is.** `predictAmberPercent` divides by the frame's
non-background pixels, which is exactly the gate's denominator (`amber % of non-bg`,
thresholds `0.2–2 %`). The prediction is made before a single frame exists.

**4. Where the panel may stand.** `visibleSpanX` scans world x at the panel's depth and keeps
only the values that project inside the free region. On a 390×844 phone the desk cluster
runs from x −0.8 to 1.4 but everything left of x ≈ 0 is off-canvas — previously 444 of 1016
amber points were outside the frame. The panel is placed inside the span, so 100 % of its
points are visible at every aspect.

**5. How many monitors and how many points.** Both are results, not constants: the count of
monitors is `floor(visibleSpan / (panelWidth + gap))` clamped to 1–3 (one on a phone, up to
three on a wide frame), and the point count is `solveCountForTarget`, a 14-step bisection
over the *real raster* of a 1200-point pool sampled from the panel quad. Coverage is
monotone but sub-linear because discs overlap, so a linear extrapolation would be wrong by
a factor that changes with aspect; bisecting the raster is not.

**6. How they are distributed.** `sampleQuad` is an area-uniform Halton (2, 3) sample
stratified over the quad's two triangles in proportion to their real area, so density on
screen is even instead of clumping where the PRNG happened to land. It is deterministic:
the same viewport gives byte-identical points.

**7. The budget.** `AMBER_FRAME_SHARE = 1.2 %` of the frame, split across however many panels
the projection allows. With 9–18 % non-background in this room that lands at 0.3–0.6 %
measured, comfortably inside the 0.2–2 % band, and the count is reasoned about before the
render instead of after it.

**8. What is not computed.** The reveal, the dolly-in and the typing offsets stay authored;
the model only answers *where* and *how many*, never *when*. Monitors keep the same points
through a morph — the amber array is compacted with the cloud (`proceduralSet.ts`), so a
flag cannot drift onto a wall point.

## Checks

`tests/light-field.test.mjs` — Halton determinism, area uniformity, span containment, solve
monotonicity and accuracy (±15 % of target), and for all four viewports: amber entirely
on screen, more than 40 points, and under 2 % of the cloud. `verify/run.mjs` measures the
rendered result against `verify/thresholds.json`; measured on 2026-10-22, dev room:

| viewport | amber % of non-bg | limit |
|---|---|---|
| mobile-390x844 | 0.49 | 0.2–2 |
| tablet-768x1024 | 0.33 | 0.2–2 |
| laptop-1440x900 | 0.56 | 0.2–2 |
| desktop-1920x1080 | 0.61 | 0.2–2 |

Non-dev rooms measure 0.00 %, as `amber.nonDevRoomExact` requires.
