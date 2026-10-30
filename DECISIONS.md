# TokenDeck Decisions

## 2026-10-30

1. Implement TokenDeck as an independent additive backend under `server/tokendeck/`.
2. Do not modify or delete any existing repository file, including the owner UI and current server.
3. Use TypeScript/Node tooling already present in the repository where practical.
4. Use Node.js 20 LTS as the supported floor.
5. Bind to `127.0.0.1` by default; LAN/Tailscale binding is opt-in.
6. Make UI serving optional through `UI_DIST_DIR`; the API must work with no UI directory.
7. Put a replaceable functional UI only in `placeholder-ui/`.
8. Make OpenAPI 3.1 the API source of truth and keep generated client types under `packages/api-client/`.
9. Use SSE for live events and document every event schema in `docs/events.md`.
10. Use AES-256-GCM for provider-key encryption and never expose plaintext keys through API responses or logs.
11. Store the vault master key through the platform credential store when available; fail closed for production setup rather than inventing a default secret.
12. Require first-run admin password setup. No default credentials.
13. Keep provider integrations OpenAI-compatible and modular.
14. Use a SQLite adapter boundary; native SQLite is preferred, with startup diagnostics if unavailable.
15. Use fake credentials only in tests.
16. Use npm-compatible scripts without requiring Docker.
17. Create milestone commits and tags after checks pass.
