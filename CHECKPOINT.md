# TokenDeck Checkpoint

## Done

- Phase 0 read-only repository scan
- GitHub research of reusable gateway projects
- Architecture and isolation decisions recorded
- Created branch `feature/tokendeck-backend` from `main`

## Next

- M1: add installer manifest and doctor/install scripts
- M2: add gateway core, encrypted vault, routing, quotas, and SQLite adapter
- M3: add replaceable placeholder UI and SSE client
- M4: add REST/OpenAPI/client generation and MCP bridge
- M5: run lint, unit, contract, and E2E tests; update documentation; tag milestones

## Blockers

- Native SQLite availability must be validated on the target machine.
- OS keychain integration requires platform-specific runtime verification.
