# The independent gate

The agent that changes the code cannot be the authority that signs it off. This directory is
the mechanism that enforces that, with the smallest amount of new infrastructure.

## Why it exists

Two measured failures in this repository, before this gate:

1. `node verify/run.mjs` — the full 60-row visual sweep — reported **29 failures** in the
   working tree, while `node verify/release-check.mjs` printed **PASS 5/5** on the same tree.
   `release:check` only reads static records; it never looked at a frame.
2. `verify/run.mjs` rewrites a failing check into `pass: true` with an `na:` label whenever a
   reason matches (`verify/run.mjs:359`). A missing measurement can therefore become a green
   row. `gates.mjs` does the same for "no rule-matched asset".

So a green line in that harness is evidence of at most what it measured. It is not a verdict.

## Commands

```bash
node verify/gate/gate.mjs                  # judge HEAD
node verify/gate/gate.mjs --commit <sha>   # judge a specific commit
node verify/gate/gate.mjs --lock           # re-approve the protected definitions
node verify/gate/gate.mjs --visual <file>  # consume a stamped visual report
node verify/gate/mutants.mjs               # mutation testing
```

Exit codes: `0` PASS, `1` FAIL, `2` BLOCKED, `3` the gate itself crashed.

## What it does

1. Resolves the commit and hashes the protected definitions (this file's siblings plus
   `verify/thresholds.json`) against `lock.json`.
2. Creates a **detached worktree** at that commit. Nothing in the working tree can move under
   the run, and a dirty tree cannot masquerade as the judged commit. `node_modules` is
   symlinked because this machine has no npm; that is the only concession.
3. Runs, inside the worktree: `tsc --noEmit`, the full unit suite, `vite build`,
   `esbuild server.ts`, `verify/release-check.mjs` and the SAST scan.
4. Records for each step the exact command, exit code, duration and a SHA-256 of its output.
5. Hashes `dist/index.html` and `dist/server.cjs` and requires them to be **newer than the
   build started** — a stale artifact cannot be presented as this commit's build.
6. Evaluates `requirements.json`: every requirement maps to named tests (`file` + exact test
   title), steps, artifacts or visual rows. A check that cannot run is `BLOCKED`, never
   `PASS`. `NOT_APPLICABLE` requires a written justification and is never counted as a pass.
7. Writes `docs/redesign/gate/report.json` with a fingerprint over commit + tree + lock +
   step outputs + artifact hashes.

## Statuses

| status | meaning |
| --- | --- |
| `PASS` | every check ran and met its expected outcome |
| `FAIL` | a check ran and did not meet it |
| `BLOCKED` | the check could not be evaluated: missing test, missing artifact, stale build, tampered definitions, absent visual evidence |
| `NOT_APPLICABLE` | explicitly justified and excluded. Never silently green. |

`severity: release` requirements decide the verdict. `severity: tracked` items are reported
under `unresolved` and in the summary. They do not fail the gate, and they cannot be mistaken
for a pass.

## Visual evidence

The gate never treats a screenshot, or its existence, as proof. It consumes a report whose
rows carry per-check verdicts and a `target.commit`; a report for another commit is refused.
That is the mechanism that stops a green sweep from being reused after the code moved.

Produce one with:

```bash
PETROS_STAMP_COMMIT=$(git rev-parse HEAD) node verify/run.mjs
node verify/gate/stamp.mjs docs/redesign/verify_shots/last-run.json
node verify/gate/gate.mjs --visual docs/redesign/gate/visual.json
```

`stamp.mjs` copies the harness rows and attaches the commit. It records what the operator
asserts, and the assertion is only as good as the tree the sweep was run in — which is why
the gate also binds the build hashes it can verify itself.

## Mutation testing

`mutants.mjs` applies one deliberate defect at a time to a detached worktree (room collapse,
removed panel bounds, an empty model answer that throws instead of falling back, a permissive
schema, a non-deterministic cloud), runs the tests that are supposed to guard that behaviour,
and requires them to fail. A survivor is a coverage gap and exits non-zero.

## The gate checks itself

`tests/gate-contract.test.mjs` asserts the properties that a single gate run cannot show:

* importing `gate.mjs` does not run the gate — it used to, which turned every test that
  imported it into a full gate run;
* every flag the usage block documents is read by the code — `--refresh` was documented
  for three commits and never implemented. There is deliberately no replacement for it:
  `--visual` already refuses a report stamped for another commit, and re-stamping one
  would forge evidence rather than refresh it;
* every requirement names a test title that the named test file really declares, so a
  requirement cannot demand a test that does not exist;
* the SAST step calls exports `server/securityScanner.ts` actually has;
* no harness file under `verify/gate/checks/` is left unreferenced.

Each of those assertions has been shown to fail when the defect it guards is put back.

## Known limits

* `node_modules` is symlinked, not installed from the lockfile. Dependency drift between the
  main tree and the judged commit is not detected. Fix requires npm in the environment.
* The visual sweep is not run by the gate; it is consumed. Without a stamped report the two
  visual requirements are `BLOCKED` by design.
* The lock file lives in the repo and the agent can rewrite it. It is tamper *evidence*, not
  access control: a changed definition is caught and reported, and re-approving it is a
  separate, visible commit.
