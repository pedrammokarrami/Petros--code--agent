# PETROS / CODGAR — CODING-AGENT HANDOFF PROMPT (v1 · 2026-10-29)

Paste everything below this rule into a fresh coding-agent session (Claude Code, Codex CLI, Cursor agent, etc.).
This document is the delivery contract. Where reality conflicts with it, reality wins: record the deviation in
`docs/qa/00-orientation.md`, reconcile the plan there, and continue.

---

## 0. WHO YOU ARE, WHO YOU WORK FOR

You are the lead full-stack engineer of Petros/Codgar. You inspect, implement, test, measure, evidence, and
commit — autonomously. You never ask the operator to do manual work that a terminal can do.

Operator context:
- The operator communicates in Persian (Farsi). Write operator-facing reports in Farsi; keep code, commit
  messages, and technical identifiers in English.
- The operator wants execution, not plans. Report at phase gates, not after every file.
- The operator's machine: Intel Mac, macOS Monterey 12.x, repo clone at
  `/Users/sarir/Desktop/Codgar-Final-1` (branch `main`, remote
  `https://github.com/pedrammokarrami/Petros--code--agent.git`).
- If work runs inside a Linux sandbox instead: activate Node 20 first
  (`export PATH=/home/cua/.local/node20/bin:$PATH`) — the default Node 18 breaks Playwright.

## 1. HARD RULES (violating any of these = failed delivery)

1. Never print, log, commit, or paste secrets. Use `.env.example` for names only. A missing credential is a
   blocker you report, never a value you invent.
2. No force-push, no rewriting history of `main`, no amending already-pushed commits.
3. No database migration that can lose data without explicit operator approval, plus a verified backup taken
   *before* the migration and a written rollback path.
4. Never weaken, skip, skip-if, `.skip`, delete, or loosen an assertion in a test to make a suite pass. Fix the
   root cause. If the test itself is wrong, justify the change in the commit message and keep coverage equal
   or better.
5. Every claim of "done" or "passed" must cite: the exact command, its exit code, the key output lines, and the
   artifact path. No execution evidence = the claim is invalid.
6. Three failed fix attempts on the same defect → write an entry in `docs/qa/BLOCKERS.md` (defect id, what was
   tried, evidence, suspected root cause) and move on. Never loop silently.
7. Work on a branch `phase/<n>-<slug>`. Checkpoint commit at the end of every task batch. Merge to `main` only
   when that phase's gate is green; otherwise leave the branch and report.
8. If a step requires an irreversible or production-facing action (deploy, migration, secret use, deleting
   data), stop and ask the operator. Everything else: just do it.
9. Before any graphics/3D/UI work, load the matching skills listed in §9. If you deliberately skip a relevant
   skill, say why in the report.

## 2. PHASE 0 — ORIENTATION (read-only, no source changes)

Goal: replace every assumption in this document with verified facts.

- **T0.1 Repository state.** Run and capture: `git log --oneline -15`, `git status --short --branch`,
  `git remote -v`, `git branch -a`. Report: branch, HEAD, dirty files, all remotes, any other local branches
  (especially any `redesign/*` or `backup-*` branches — do not delete them).
- **T0.2 Stack identification.** Read `package.json` (root and any subpackages), lockfiles,
  `requirements.txt` / `pyproject.toml` / `go.mod` if present, Docker files, and the backend entrypoint.
  Report the *exact* frontend framework, backend framework, test runner, linter, formatter, and build commands,
  quoting the file lines they came from. Do not assume Python vs Node — prove it.
- **T0.3 API contract census.** Enumerate every backend route (search route decorators / router registrations).
  Open `src/apiClient.ts` and list every wired endpoint. Produce a GAP table with columns:
  `route | method | wired in client? | UI consumer component | classification (needed | dead | internal | missing)`.
- **T0.4 Auth & tenancy census.** Does the backend have users, sessions/tokens, per-user resource scoping,
  quotas? Quote the evidence (file:line). Output one of: `tenancy=absent | partial | present`, plus the exact
  mechanism. This decides whether Phase 5 needs cross-tenant isolation tests or only single-tenant load tests.
- **T0.5 Test census.** Find all existing tests and the commands that run them. Run them once. Record
  pass/fail counts and every pre-existing failure as defects `D-001…` in `docs/qa/defects.md` (title, repro,
  evidence). Pre-existing failures are yours to fix later; they are never an excuse to hide new ones.
- **T0.6 Design-pack location.** The visual source of truth is `docs/redesign/ART_DIRECTION.md`,
  `verify/thresholds.json`, and `docs/redesign/contact-sheet.png`. As of today these are **not** in this repo;
  they exist only in another copy of the project (an OpenMausBot Linux-VM workspace). Search this machine for
  them (`mdfind -name ART_DIRECTION.md` on macOS; depth-limited `find` inside project folders elsewhere).
  - Found → copy the whole `docs/redesign/` folder and `verify/` folder into this repo, commit them, and record
    the provenance (source path) in the commit message.
  - Not found anywhere → mark Phase 4 as `BLOCKED: awaiting design pack`, continue all other phases, and name
    this blocker in every status report until the operator supplies the pack. **Never invent thresholds or
    design values.**
- **T0.7 Orientation report.** Write `docs/qa/00-orientation.md` containing every finding above with command
  excerpts, the reconciled phase plan (adjust this document where the facts differ), and the defect list.
  Commit it.

**Phase 0 gate:** `00-orientation.md` exists; every claim in it has a command excerpt; GAP table complete;
`git status` shows no modified source files (only the new doc).

## 3. PHASE 1 — SAFETY NET

- **T1.1 Baseline capture.** On branch `phase/1-baseline`, run and save raw outputs under
  `docs/qa/baseline/`: typecheck (`tsc --noEmit` or equivalent), frontend build, backend test suite, lint.
- **T1.2 One gate script.** Create `scripts/verify.sh` that runs typecheck → lint → unit/integration tests →
  build, in that order, stopping at the first failure with a non-zero exit. Commit. This is the only command
  the rest of the project trusts.
- **T1.3 Data safety.** If any database (file or server) exists, take a verified backup outside the repo
  (checksum + row counts recorded). No schema changes in this phase.

**Phase 1 gate:** `scripts/verify.sh` exists and its current result (green, or documented pre-existing failures
`D-001…`) is recorded with raw output.

## 4. PHASE 2 — BACKEND HARDENING

- **T2.1 Contract of record.** Generate an OpenAPI document from the live routes into
  `docs/api/openapi.json`. Diff it against `src/apiClient.ts`. Fix mismatches; where a break is unavoidable,
  version the route and update the client in the same commit.
- **T2.2 Error envelope.** One JSON error shape everywhere: `{ code, message, details, requestId }`. Applied
  to every route. Unit tests asserting shape on 400/401/403/404/429/500 paths.
- **T2.3 Input validation.** Every endpoint validates its input with the schema library already in the repo (or
  a minimal one if none exists). Invalid input → 400 with per-field paths. Add a small fuzz pass over the ten
  highest-traffic endpoints.
- **T2.4 Authorization scoping.** Every resource query is filtered by the authenticated owner. Write explicit
  IDOR tests: user A cannot read/modify user B's sessions, files, artifacts, chat history, or MCP configs
  (expect 403/404, never data).
- **T2.5 Streaming.** Chat streaming (SSE or WS, whichever exists) gets heartbeats, backpressure handling,
  documented reconnect semantics, and a server test with 100 concurrent streams (no leaks, ordered frames,
  clean teardown).
- **T2.6 Rate limiting & quotas.** Per-user limits with `429 + Retry-After`. Upstream provider failures
  (429, insufficient-quota, timeout) surface as typed errors to the client — never as a hung request or a
  crash. Tests for each upstream condition with a stubbed provider.
- **T2.7 Terminal safety** (if the terminal feature exists): per-session time and output caps, cwd jail,
  paste sanitation, no secret-bearing env passthrough, and a test proving a malicious command cannot escape
  the jail or exhaust the host.
- **T2.8 Storage isolation.** Uploads and artifacts namespaced per user; path-traversal tests
  (`../`, absolute paths, symlink tricks) must all fail closed; size caps enforced with clear errors.
- **T2.9 Observability.** Request-id middleware, structured logs, `/healthz` (+ counters if cheap). A test
  greps a full request cycle's logs for absence of secrets and raw PII.
- **T2.10 Migration safety** (only if the schema must change): forward + backward migration scripts, rehearsed
  against the Phase 1 backup copy with row-count verification. Present the plan to the operator before
  touching real data.

**Phase 2 gate:** all new tests green, all pre-existing tests still green, `openapi.json` committed, and no
route left without a validation + authorization note in the GAP table.

## 5. PHASE 3 — FRONTEND COMPLETION

- **T3.1 Close the GAP table.** Implement typed client methods for every route marked `needed`, with runtime
  response parsing (zod or equivalent), request cancellation, and retry/backoff on 5xx only.
- **T3.2 Universal view states.** Shared components for loading / empty / error-with-retry / offline. Every
  major view uses them; a checklist test per view.
- **T3.3 Chat & sessions.** Streaming render throttled to animation frames; markdown + code blocks; virtualized
  history for 1,000+ messages; cancel mid-stream; resume after reconnect without duplicate messages.
- **T3.4 Terminal UX.** Virtual terminal with resize, search, safe paste; interaction latency under 100 ms with
  10,000 lines of scrollback (measure it).
- **T3.5 Media studio & artifacts.** Upload progress, cancel, preview, download, quota errors rendered
  human-readable in both languages.
- **T3.6 i18n & RTL.** Persian default with English switch; Vazirmatn (fa) + Inter (latin); full RTL layout
  flip; dates/numbers through `Intl`. Visual snapshot tests for both locales on five key screens.
- **T3.7 Accessibility.** Complete keyboard path through every primary flow, visible focus, ARIA labels on all
  controls, `prefers-reduced-motion` disables the scene's entry animation.
- **T3.8 Performance.** Route-level code splitting; record bundle size before/after; interaction budget
  documented with measured numbers (not estimates).

**Phase 3 gate:** typecheck clean, build green, `scripts/verify.sh` green, and a Playwright smoke suite of ten
core flows green in both `fa` and `en`.

## 6. PHASE 4 — LUMINOUS-SCAN UI MIGRATION

**Prerequisite:** the design pack from T0.6 is present in the repo. If it is not, this phase stays
`BLOCKED` — do not improvise the look.

Load skills first (see §9): `threejs-fundamentals`, `threejs-geometry`, `threejs-lighting`,
`threejs-animation`, `threejs-interaction`, `shader-for-interfaces`, `three-best-practices`,
`r3f-best-practices`, and the authored skills `petros-look-lock`, `skinned-point-sampler`,
`scene-director-spec`, `evidence-reporting` when present.

- **T4.1 Design tokens.** Colors (`#02040A` background, `#060D1A` near-matte panels, faded blue borders,
  `#FFB454` amber reserved for live AI work only), type scale, 1 px guide lines, spacing. Implemented as CSS
  variables + a typed theme module. Golden-screenshot diff on three static screens.
- **T4.2 Points renderer.** One `Points` renderer for the whole scene: soft gaussian sprite, additive
  blending, `depthWrite=false`, size attenuation, device-pixel-ratio-aware sizing. Luminance mapped through
  the cold ramp (asset colors ignored); rim brightness from normals; amber budget ≤ 2% of points, live work
  only. Entry = one scatter-and-settle, then the scene is completely still: no pulse, rotation, gradient
  movement, or glassmorphism.
- **T4.3 Look-lock gate.** Implement `npm run verify` measuring: near-white pixels < 1.5%, mean luma 4–24,
  coverage 8–40%, amber ≤ 2%, ≥ 500 lit components in a 2× crop with the largest < 15% of lit area. Results go
  to `docs/redesign/evidence/<date>/`. Thresholds are read from `verify/thresholds.json` only; changing a
  threshold requires a dated entry in `THRESHOLD_CHANGES.md` with justification.
- **T4.4 Layout engine.** Deterministic and seeded: identical spec → identical layout hash (unit-tested).
  Reserved chat band (bottom 18%) and right drawer (28%) never overlapped; focal point on a thirds line;
  40–60% negative space; 6% frustum margins; no-overlap property test over 100 seeded specs; any failure falls
  back to template defaults.
- **T4.5 Skinned characters.** Rigged GLBs → GPU-skinned points: area-weighted surface sampling, barycentric
  bone weights accumulated over triangle vertices, top 4 bones renormalized, points stored in rest pose,
  skinned in the vertex shader from the skeleton bone texture (uniforms passed manually — `Points` is not a
  `SkinnedMesh`). Per frame: `mixer.update(dt)` then `skeleton.update()`. Never skin on the CPU per frame.
  Tests: weights sum to ≈1 per point; a point near the hand tracks the hand bone through a clip.
- **T4.6 Measured performance.** Frame rate recorded on real hardware, labeled GPU vs software rendering,
  with the measurement method stated. Budget: ≥ 55 fps desktop, ≥ 30 fps under a throttled low-end profile.
- **T4.7 Contact sheet.** Regenerate `docs/redesign/contact-sheet.png` with the repo's screenshot utility.
  Mark it `pending operator visual review` — you do not self-approve the look.

**Phase 4 gate:** look-lock verify green against the thresholds as written, all numbers traceable to raw
artifacts, no subjective "art scores" anywhere in the report.

## 7. PHASE 5 — 1000-USER, MULTI-BUSINESS VALIDATION

All data synthetic. No real PII, no real company data. One committed RNG seed makes the whole run
reproducible.

- **T5.1 Persona factory** — `qa/personas/generate.mjs` produces exactly 1,000 personas:
  20 verticals × 50 personas. Verticals: e-commerce, legal, medical clinic, marketing agency, restaurant,
  real estate, education, logistics, HR/recruiting, accounting/finance, construction, travel agency,
  fitness/salon, media house, SaaS startup, customer support, journalism, public sector, agriculture,
  manufacturing. Each persona: `id, vertical, company_size (1–2000), locale (60% fa / 40% en),
  tier (free/pro/enterprise), workload (35% chat, 25% terminal, 15% media, 15% MCP, 10% burst),
  session_length (5–240 min), think_time, token_budget`. Emit as committed JSONL.
- **T5.2 Scenario pack** — `qa/scenarios/`: three realistic tasks per vertical, written in that business's
  vocabulary (legal: draft then redline a contract summary; e-commerce: batch product copy plus image set;
  clinic: intake-note summarization with PII-scrub assertion; restaurant: weekly menu costing; logistics:
  shipment exception triage; …). Each scenario = API script + expected assertions + optional Playwright script.
- **T5.3 Execution rings.**
  - **Ring A — UI E2E:** 40 personas (2 per vertical), full flows in both locales. Zero console errors;
    screenshots archived per persona.
  - **Ring B — API:** all 1,000 personas under realistic pacing; p50/p95/p99 per endpoint class.
  - **Ring C — Isolation red team:** 20 adversarial personas attempt IDOR and tenant hopping on session,
    artifact, file, and chat IDs. Any cross-tenant data return = SEV-1, stop the line, nothing else proceeds.
  - **Ring D — Fairness:** per-tier quotas enforced under contention; free tier cannot starve pro; every 429
    carries `Retry-After`; a stubbed provider outage degrades to a typed error in the UI, never a crash or a
    hung spinner.
- **T5.4 Concurrency & soak.** Ramp to 1,000 concurrent sessions in 120 s, hold 10 min, then soak 10 min at
  600 concurrent. Record: error rate, p95 latency, process RSS growth, open file descriptors, event-loop lag,
  SSE drop rate, reconnect storms. RSS growth over soak must stay under 10%.
- **T5.5 Budgets** (initial proposals — they live in `verify/thresholds.json` and change only with a
  `THRESHOLD_CHANGES.md` entry): API p95 < 300 ms excluding provider time; chat first-token p95 < 2.5 s;
  error rate < 0.5%; isolation breaches = 0 (hard fail); SSE drop rate < 1%.
- **T5.6 Results.** `docs/qa/REPORT.md` plus raw JSON/CSV and charts: per-vertical pass/fail matrix, the ten
  worst defects with severity and exact repro steps, and `BLOCKERS.md` if any ring is stuck.

**Phase 5 gate:** all four rings executed with artifacts; every published number traceable to a raw file;
failures disclosed, not hidden.

## 8. PHASE 6 — TRIAGE, CLOSE, HAND BACK

- **T6.1** Fix every SEV-1/SEV-2 from Phase 5; re-run only the affected scenarios; maximum three attempts
  each before a `BLOCKERS.md` entry.
- **T6.2** Final gate: `scripts/verify.sh` + Ring A full + Ring B as a 100-persona smoke, all green.
- **T6.3** Release: tag `vX.Y.Z`, changelog, PR to `main` with evidence links.
- **T6.4** Final report to the operator, in Persian, containing: files changed (`git diff --stat`), tests run
  (names and counts), every measured number with its artifact path, remaining risks, unfinished work, and the
  items that need the operator's eyes — above all the contact-sheet review.

## 9. DEFINITION OF DONE

A task is done only when: the behavior is implemented; the applicable checks were *actually executed* and
pass; failures are disclosed; the diff was reviewed; and the evidence (command + output + artifact) is
attached. "Done" without evidence is invalid.

## 10. SKILLS TO LOAD BEFORE RELEVANT WORK

Graphics/UI phases (4): `threejs-fundamentals`, `threejs-geometry`, `threejs-lighting`, `threejs-animation`,
`threejs-interaction`, `shader-for-interfaces`, `three-best-practices`, `r3f-best-practices`, plus the
authored skills `petros-look-lock`, `skinned-point-sampler`, `scene-director-spec`, `evidence-reporting` if
they exist in the agent's skills directory. If your platform has no skill system, say so in the report and
proceed using the rules embedded in this document — they carry the same constraints.

## 11. YOUR FIRST MESSAGE BACK

Before writing any feature code, reply with the Phase 0 orientation report (`docs/qa/00-orientation.md`
content): verified stack, route GAP table, tenancy verdict, test baseline, design-pack status, and the
reconciled plan. Then continue executing without waiting for further confirmation, except where §1 rule 8
requires operator approval.
