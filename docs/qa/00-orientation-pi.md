# T0.1+T0.2 — Repo & Stack Inventory (Phase-0 Orientation)

**Repo:** `C:\Users\ELI\Petros` (Petros/Codgar)
**Branch:** `main`
**HEAD (local):** `2b7d2b4` (2 commits ahead of origin/main)
**HEAD (origin/main):** `925a5dd`
**Remote:** `origin https://github.com/pedrammokarrami/Petros--code--agent.git` (fetch & push)
**Local branches:** `main` only
**Remote branches:** `remotes/origin/HEAD -> origin/main`, `remotes/origin/main`, plus dependabot/npm_and_yarn/test-project/* branches
**Dirty files:** none (working tree clean relative to `main...origin/main [ahead 2]`)
**Tool versions:** node v24.22.1, git 2.56.0.windows.4, npm 11.19.1

## T0.1 — Branch / HEAD / dirty-file state / remotes / local branches

Raw command output:

```
$ git log --oneline -15
2b7d2b4 docs: update TRACKER.md with calibration task statuses
fddbe29 docs: add TRACKER.md (coordinator startup)
925a5dd docs: playbook - add tool-budget discipline (per-turn slicing, checkpoint rules)
3e5569f docs: add coordinator playbook (slicing, delivery/acceptance loop, task index)
ca12f86 docs: import Luminous-scan design pack from VM (ART_DIRECTION, thresholds, verify harness, contact sheet)
d5565fb docs: add coding-agent handoff prompt (phases 0-6, 1000-user validation)
9b05831 Merge remote README
c834a57 Update frontend/backend changes
e90ea3c Initial commit
987d019 exclude release binaries
cd85996 clean initial commit

$ git status --short --branch
## main...origin/main [ahead 2]

$ git remote -v
origin	https://github.com/pedrammokarrami/Petros--code--agent.git (fetch)
origin	https://github.com/pedrammokarrami/Petros--code--agent.git (push)

$ git branch -a
* main
  remotes/origin/HEAD -> origin/main
  remotes/origin/dependabot/npm_and_yarn/test-project/sample-03-chat/body-parser-1.20.9
  remotes/origin/dependabot/npm_and_yarn/test-project/sample-03-chat/multer-2.5.0
  remotes/origin/dependabot/npm_and_yarn/test-project/sample-03-chat/qs-6.16.2
  remotes/origin/main
```

No `redesign/*` or `backup-*` branches exist. No uncommitted changes.

## T0.2 — Exact stack (each quoted from a file line)

### Frontend framework (from `package.json`)

- `"react": "^19.0.1"`
- `"react-dom": "^19.0.1"`
- `"vite": "^8.3.0"`
- `"@vitejs/plugin-react": "^6.1.1"`
- `"tailwindcss": "^4.3.3"`
- `"@tailwindcss/vite": "^4.3.3"`
- `"motion": "^12.43.0"`
- `"three": "^0.186.0"`
- `"lucide-react": "^0.546.0"`

### Backend framework (from `package.json` and `server.ts`)

- `"express": "^4.21.2"`
- Backend entrypoint: `server.ts` (167 KB, root directory)
- Dev command: `"dev": "tsx server.ts"` (tsx ^4.21.0)

### Test runner

- **No test runner declared** in `package.json` scripts. There is no `"test"` script.
- Test files exist under `./test-project/`, `./apps/`, and `./Codgar-Ultimate-Core/tests/` but no npm script runs them.

### Linter / formatter

- Linter: `"lint": "tsc --noEmit"` (TypeScript type check, typescript ^7.0.2)
- **No formatter declared** (no prettier, no biome, no eslint in scripts).

### Build commands (from `package.json` `"scripts"`)

```json
"scripts": {
  "dev": "tsx server.ts",
  "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
  "start": "node dist/server.cjs",
  "preview": "vite preview",
  "clean": "rm -rf dist server.js",
  "setup": "cp -n .env.example .env 2>/dev/null || true && npm install",
  "lint": "tsc --noEmit"
}
```

### Lockfiles

- `package-lock.json` (237,303 bytes) — present
- `bun.lock` (197,121 bytes) — present

### Source tree otherwise untouched

No source files were modified. Only `docs/qa/00-orientation-pi.md` was created for this report.

---
**Report:** DONE T0.1+T0.2 | branch: main | commit: 2b7d2b4 | evidence: docs/qa/00-orientation-pi.md | notes: local HEAD is 2 commits ahead of origin/main; no test script declared in package.json.