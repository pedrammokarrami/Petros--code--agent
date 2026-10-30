# TokenDeck Repository Map

## Phase 0 scan

- Repository: `pedrammokarrami/Petros--code--agent`
- Branch base: `main`
- Implementation branch: `feature/tokendeck-backend`
- Dominant language: TypeScript
- UI: React 19, Vite 8, Tailwind CSS
- Runtime: Node.js; `tsx` for development
- Package managers: npm and Bun lockfile
- Existing server: `server.ts` and `server/`
- Existing backend modules: `backend/durable`, `backend/router`, `backend/security`
- Existing UI entry points: `src/`, `index.html`, `public/`

## Existing scripts

- `npm run dev`: Vite plus `tsx server.ts`
- `npm run build`: Vite build plus esbuild server bundle
- `npm start`: starts the existing bundled application
- `npm run lint`: TypeScript check

## Isolation rules

TokenDeck is additive only. Existing files, routes, components, styles, design tokens, and server behavior are not modified.

- Backend: `server/tokendeck/`
- OpenAPI: `server/tokendeck/openapi/`
- Typed client: `packages/api-client/`
- Placeholder UI: `placeholder-ui/`
- Event documentation: `docs/events.md`
- Installer manifests: `installer/`
