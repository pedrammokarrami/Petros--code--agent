# T0.5 — Test Census + First Run (Phase-0 Orientation)

**Repo:** `C:\Users\ELI\Petros` (Petros/Codgar)
**Branch:** `main`
**HEAD:** `6530e2b` (3 commits ahead of origin/main)
**Date:** 2026-10-29
**Node:** v24.22.1
**Test runner:** Node.js native `--test` (no npm `test` script in root `package.json`)

---

## Test Command(s) Found

### 1. `test-project/` (standalone test suite)
```json
// test-project/package.json
"scripts": {
  "test": "node --test test.js"
}
```
Command: `cd test-project && npm test`
Runner: Node.js native `--test` on `test.js`

### 2. `Codgar-Ultimate-Core/` (integration test suite)
```json
// Codgar-Ultimate-Core/package.json (root package.json scripts)
"scripts": {
  "test": "node --test --test-concurrency=1 tests/*.test.mjs"
}
```
Command: `cd Codgar-Ultimate-Core && npm test` (runs from root)
Runner: Node.js native `--test` with `--test-concurrency=1` on `tests/*.test.mjs`

---

## Test Files Enumerated

| File | Suite | Type | Test Count |
|------|-------|------|------------|
| `test-project/mathUtil.test.js` | test-project | unit | 3 |
| `test-project/test.js` | test-project | unit | 2 |
| `Codgar-Ultimate-Core/tests/repo-hygiene.test.mjs` | Codgar-Ultimate-Core | unit | 4 |
| `Codgar-Ultimate-Core/tests/api.test.mjs` | Codgar-Ultimate-Core | integration | 12 |
| `Codgar-Ultimate-Core/tests/engines.test.mjs` | Codgar-Ultimate-Core | integration | 7 |

**Total test files:** 5  
**Total test cases:** 28

---

## First Run Results

### Suite A: `test-project` — `npm test` (run from `test-project/`)
```
✔ calculateSum adds numbers correctly (2.79ms)
✔ clamp restricts values within specified range (0.59ms)
✔ add calculates sum correctly
✔ multiply calculates product correctly
✔ formatGreeting creates expected greeting
```
**Result:** 5 tests, **5 passed, 0 failed** ✅

### Suite B: `Codgar-Ultimate-Core` — `npm test` (run from root)
```
✔ no hardcoded sk- secrets in server sources (143ms)
✔ security gate is wired and covers the dangerous routes (11ms)
✔ server binds to env-configurable PORT/BIND_HOST (no hardcoded 3000 listen) (3ms)
✔ no backup or one-shot patcher artifacts are shipped (1ms)

✖ H1: PORT and BIND_HOST env vars are honoured (89968ms)
✖ health endpoint answers with an honest payload (34ms)
✖ SPA is served at / and unknown client routes (0ms)
✖ yadow router answers /api/status as JSON and is not double-mounted (0ms)
✖ C1 regression: repeated /api/pool/cascade calls must not kill the server (0ms)
✖ C3: cross-origin requests cannot reach shell execution endpoints (0ms)
✖ C3: dangerous routes reject non-JSON bodies (0ms)
✖ C3: same-origin shell execution still works (architecture preserved) (0ms)
✖ chat endpoint answers without crashing when no router is reachable (0ms)
✖ pool metrics and router topology answer with JSON (0ms)
✖ H7: CORS headers are only echoed for allowed origins (0ms)
✖ compiler language registry is available for the universal engine (0ms)
✖ SAST scanner flags a leaked key and eval in injected code (90235ms)
✖ SAST tree scan reports real numbers (no fabricated metrics) (2ms)
✖ AST patch applies a valid edit and verifies syntax (0ms)
✖ AST patch refuses an edit that would break syntax (0ms)
✖ AST patch refuses non-unique anchors and path traversal (0ms)
✖ code index builds and retrieves relevant chunks (0ms)
✖ exec endpoints stay protected for cross-origin callers (0ms)
```
**Result:** 23 tests, **4 passed, 19 failed** ❌

---

## Failures — Defects D-001…D-019

All 19 failures share the same root cause: the integration test `before` hook cannot start the backend server within the 90-second timeout. The error is:

```
Error: server did not become healthy in time
    at waitForHealth (tests/api.test.mjs:36:9)
    at async TestContext.<anonymous> (tests/api.test.mjs:57:3)
```

Additional error from hook cleanup:
```
Error: Test hook "before" at tests/api.test.mjs:39:1 generated asynchronous activity after the test ended.
This activity created the error "Error: spawn C:\Users\ELI\Petros\Codgar-Ultimate-Core\node_modules\.bin\tsx ENOENT"
```

### Defect List

| ID | Test Title | Repro | Raw Output Excerpt |
|----|------------|-------|---------------------|
| D-001 | H1: PORT and BIND_HOST env vars are honoured | `cd Codgar-Ultimate-Core && npm test` | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-002 | health endpoint answers with an honest payload | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-003 | SPA is served at / and unknown client routes | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-004 | yadow router answers /api/status as JSON and is not double-mounted | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-005 | C1 regression: repeated /api/pool/cascade calls must not kill the server | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-006 | C3: cross-origin requests cannot reach shell execution endpoints | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-007 | C3: dangerous routes reject non-JSON bodies | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-008 | C3: same-origin shell execution still works (architecture preserved) | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-009 | chat endpoint answers without crashing when no router is reachable | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-010 | pool metrics and router topology answer with JSON | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-011 | H7: CORS headers are only echoed for allowed origins | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-012 | compiler language registry is available for the universal engine | same | `Error: server did not become healthy in time at waitForHealth (api.test.mjs:36:9)` |
| D-013 | SAST scanner flags a leaked key and eval in injected code | `cd Codgar-Ultimate-Core && npm test` | `Error: server did not become healthy in time at waitForHealth (engines.test.mjs:31:9)` |
| D-014 | SAST tree scan reports real numbers (no fabricated metrics) | same | `Error: server did not become healthy in time at waitForHealth (engines.test.mjs:31:9)` |
| D-015 | AST patch applies a valid edit and verifies syntax | same | `Error: server did not become healthy in time at waitForHealth (engines.test.mjs:31:9)` |
| D-016 | AST patch refuses an edit that would break syntax | same | `Error: server did not become healthy in time at waitForHealth (engines.test.mjs:31:9)` |
| D-017 | AST patch refuses non-unique anchors and path traversal | same | `Error: server did not become healthy in time at waitForHealth (engines.test.mjs:31:9)` |
| D-018 | code index builds and retrieves relevant chunks | same | `Error: server did not become healthy in time at waitForHealth (engines.test.mjs:31:9)` |
| D-019 | exec endpoints stay protected for cross-origin callers | same | `Error: server did not become healthy in time at waitForHealth (engines.test.mjs:31:9)` |

---

## Root Cause Analysis

The integration tests in `Codgar-Ultimate-Core/tests/` use a `before` hook that:
1. Spawns `tsx server.ts` as a child process
2. Waits up to 90 seconds for `/api/health` to return 200
3. All tests depend on this server being alive

**Failure reasons:**
- `tsx` binary not found at `node_modules/.bin/tsx` (`ENOENT`) — dependencies may not be installed in `Codgar-Ultimate-Core/` or the path resolution is incorrect
- Server startup takes > 90 seconds (possibly missing env vars, port conflicts, or build step needed)
- The `before` hook runs for *each* test file independently, causing multiple server spawn attempts

**Note:** The 4 passing tests in `repo-hygiene.test.mjs` are pure unit tests that do not start the server.

---

## Summary

| Suite | Files | Tests | Passed | Failed | Status |
|-------|-------|-------|--------|--------|--------|
| test-project | 2 | 5 | 5 | 0 | ✅ PASS |
| Codgar-Ultimate-Core | 3 | 23 | 4 | 19 | ❌ FAIL |
| **Total** | **5** | **28** | **9** | **19** | **MIXED** |

---

**Report:** DONE T0.5 | branch: main | commit: 6530e2b | evidence: docs/qa/00-test-census.md | notes: 19 pre-existing failures logged as D-001–D-019; all integration tests fail due to server startup timeout / missing tsx binary.