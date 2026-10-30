# TokenDeck

TokenDeck is an additive local OpenAI-compatible gateway for MausBot. It is isolated under `server/tokendeck/` and does not serve or modify the existing product UI.

## Development

```bash
cd server/tokendeck
npm install
node index.mjs
```

The server binds to `127.0.0.1:8787` by default. Set `TOKENDECK_HOST`, `TOKENDECK_PORT`, `UI_DIST_DIR`, and `TOKENDECK_CORS_ORIGINS` as needed.

First startup requires an admin password through `POST /api/v1/setup`; no default credentials exist.

## Installer

- Windows: `install.ps1 doctor` or `install.ps1 install`
- macOS/Linux: `install.sh doctor` or `install.sh install`
- Both support `--dry-run`.

## API

OpenAPI source: `server/tokendeck/openapi/openapi.json`.

Key endpoints: `/api/v1/health`, `/api/v1/status`, `/api/v1/keys`, `/api/v1/keys/active`, `/api/v1/usage`, `/api/v1/combos`, `/api/v1/events`.

Provider credentials are encrypted with AES-256-GCM and are never returned in full.
