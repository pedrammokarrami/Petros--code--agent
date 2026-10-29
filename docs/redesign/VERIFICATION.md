# Verification contract

Everything in `verify/` measures `dist/`, not `src/`. This document is the single place that
says which runtime is supported, how a fresh build is guaranteed, and what each entry point
promises. If a script disagrees with this page, the script is wrong.

## Supported runtime

**Node.js 20 or 22 (LTS).** Not "18 and up".

Playwright 1.64 hard-exits on Node < 20 inside its own bootstrap (`bootstrap.js:26-33`), before
any test body runs, so an old Node turns "the browser check failed" into a lie about the app.
`verify/lib/runtime.mjs` asserts the floor up front (`MIN_NODE_MAJOR = 20`) so the error names
Node instead of Playwright.

Two rules follow from that, and both are enforced in code, not in a shell profile:

- The harness spawns children with `process.execPath`, never the bare name `node`. A Node 20
  harness must not start a Node 18 server from `PATH`.
- `npm` is resolved next to the running node (`npmCommand()` → `dirname(process.execPath)/npm`),
  not from `PATH`. This VM has no `npm` in `/usr/bin` at all, and `PATH` can point at an older
  node; resolving next to `process.execPath` keeps build and harness in one toolchain.

PATH is never the contract. Setting `PATH` in one shell fixes that shell only; every script that
matters resolves its own interpreter.

## Canonical commands

| Command | What it does | Needs `dist`? |
| --- | --- | --- |
| `npm run lint` | `tsc --noEmit` | no |
| `npm test` | `node --import tsx --test tests/*.test.mjs` (includes the forbidden-copy control) | no |
| `npm run build` | `vite build` + `esbuild server.ts` | writes it |
| `npm run verify:copy` | forbidden-copy gate, 5 rooms × 2 viewports, no screenshots (~1 min) | builds if stale |
| `npm run verify:shots` | one screenshot per room per viewport + `manifest.json` | builds if stale |
| `npm run verify` | full 20-cell visual/UX sweep + contact sheet | builds if stale |
| `npm run verify:selftest` | unit self-tests of the verify library (no browser) | no |

The gated browser test is separate on purpose: `PETROS_REVEAL_E2E=1 npm test`.

## Freshness contract

`verify/lib/fresh.mjs` owns the rule and `verify/lib/server.mjs` enforces it.

- `SOURCE_PATHS` — the inputs a build must be at least as new as (`src/`, `server/`, `server.ts`,
  `index.html`, `vite.config.ts`, `scripts/build-point-assets.mjs`, `public/`). `server/` is an
  input because `build` bundles `server.ts` with esbuild and that entry imports 22 modules from
  `./server/` into `dist/server.cjs`; omitting it let a changed server module leave `dist/`
  classed as fresh. Covered by `tests/freshness-contract.test.mjs`.
- `classifyDist(root)` / `classifyFreshness()` — pure comparison, unit-testable.
- `ensureFreshDist(root, { build })` — used by entry points that *may* rebuild:
  `verify/run.mjs`, `verify/copy.mjs`, `verify/shots.mjs`, `verify/p2-shots.mjs`. `build: true`
  rebuilds once and re-checks; `build: false` (`--no-build`) fails with the stale path instead of
  touching the tree. This is what CI uses, because CI already built.
- `assertFreshDist()` — called by `startServer()`. Any caller that forgot to guarantee freshness
  gets a hard failure before the port is opened, so an old `dist/server.cjs` can never be measured
  as if it were current.

There is no silent fallback: a stale build is either rebuilt (once) or refused.

## Forbidden product copy

Engineering provenance (`PENDING_HUMAN_INPUT`, `*_PROVIDER=`, "asset pending", "lands in P5", …)
must never reach the product surface.

- Patterns live once, in `verify/thresholds.json` → `copy.patterns`, with `copy.rooms` and
  `copy.viewports`. No script inlines a pattern.
- `verify/lib/copy.mjs` — `normalizeText()` (collapses whitespace and zero-width marks, lowercases,
  so RTL/LTR mixing and `innerText` line breaks do not hide a match) and `findForbiddenCopy()`,
  which returns pattern **ids only** — a failure names what leaked, never dumps page text.
- `verify/copy.mjs` — the CLI gate. Per room it waits for `__sceneReadyRoom`, then for the
  `[data-room]` marker to equal the room under test before reading text, so the previous room's
  stale DOM cannot pass as the next room's content. Also fails on page/console errors.
  `--query='?provenance=1'` is the negative control: that developer-only surface is exactly the
  copy this gate forbids, so the gate must go red on it.
- `tests/forbidden-copy.test.mjs` — the control in both directions: clean product copy produces no
  hits, every configured pattern is detected, and `p5s` / `P50` / `P800` do not trip the
  whole-word phase rule.
- `verify/run.mjs` runs the same check inside every cell of the full sweep.

Changing a pattern is a threshold change: add an entry to `docs/redesign/THRESHOLD_CHANGES.md`.

## Screenshots

`verify/shots.mjs` is the maintained screenshot workflow; there is no second one.

`node verify/shots.mjs [--out=<dir>] [--prefix=<str>] [--room=<id,...>] [--no-build]`

- Fresh build guaranteed (same `ensureFreshDist`), then room readiness *and* the `data-room`
  marker are required before the frame is taken.
- Fails, exit 1, on: critical browser/console errors, a missing or zero-byte PNG, or a PNG whose
  dimensions differ from the requested viewport.
- Writes `manifest.json` next to the images: run timestamp, git HEAD, build flag, and per-shot
  room/viewport/path/bytes/dimensions — so a directory of PNGs can be tied to one run.
- Default output directory is unchanged, and existing files are never deleted; a different
  `--out` / `--prefix` writes elsewhere and leaves prior evidence intact.

The 20-cell sweep (`npm run verify`) is the audit-grade run: it also computes the luminance,
coverage and amber budgets from `verify/thresholds.json` and produces
`docs/redesign/contact-sheet.png` for human review.

## CI

`.github/workflows/ci.yml` runs on Node 22 and executes: `npm ci` → `npm run lint` → `npm test`
→ `npm run build` → `node verify/copy.mjs --no-build` (validates the build it just made rather
than rebuilding it) → SAST.

The full 20-cell matrix is **not** a CI job: it needs a SwiftShader-capable browser, takes far
longer than the gate, and its output needs a human eye on the contact sheet. Run it on release
candidates and before merging visual work.

## Known limitations

- The gate reads `document.body.innerText`, so copy rendered only inside a canvas or an
  off-screen/`display:none` subtree is invisible to it.
- Freshness is mtime-based. A checkout that restores old mtimes can look stale (it rebuilds) or,
  with `--no-build`, fail — it will not silently pass.
- `tests/backdrop-reveal.test.mjs` needs `PETROS_REVEAL_E2E=1` plus Chromium; CI does not set it,
  because the reveal sequence is slower than the rest of the suite and is verified manually.
